
from collections import defaultdict
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client
import json

from config import SUPABASE_URL, SUPABASE_KEY


router = APIRouter(
    prefix="/reports",
    tags=["Reports & Analytics"]
)

security = HTTPBearer(auto_error=False)


def get_authenticated_client(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required."
        )

    try:
        client = create_client(SUPABASE_URL, SUPABASE_KEY)

        auth_response = client.auth.get_user(
            credentials.credentials
        )

        if not auth_response.user:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired session."
            )

        client.postgrest.auth(credentials.credentials)

        return client, auth_response.user

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired session."
        )


def to_text(value):
    if value is None:
        return ""

    if isinstance(value, list):
        return "\n".join(
            str(item)
            for item in value
            if item is not None
        )

    return str(value)


def get_handover_status(handover):
    if not handover:
        return "not_started"

    status = handover.get("status", "")

    status_map = {
        "pending_employee_review": "not_started",
        "pending_manager_review": "awaiting_approval",
        "changes_requested": "changes_requested",
        "approved": "approved",
        "shared": "approved",
    }

    return status_map.get(
        status,
        status or "not_started"
    )


# ---------------------------------------------------------
# Employee report helpers
# ---------------------------------------------------------

def parse_json_list(value):
    """
    Safely converts JSONB values into a list.

    Supabase normally returns JSONB arrays as Python lists,
    but this also handles strings, dictionaries and nulls.
    """
    if value is None:
        return []

    if isinstance(value, list):
        return value

    if isinstance(value, dict):
        return [value]

    if isinstance(value, str):
        value = value.strip()

        if not value:
            return []

        try:
            parsed = json.loads(value)

            if isinstance(parsed, list):
                return parsed

            if isinstance(parsed, dict):
                return [parsed]

            if parsed is None:
                return []

            return [parsed]

        except (ValueError, TypeError):
            return [value]

    return [value]


def get_non_empty_summary(journal):
    summary = journal.get("work_summary")

    return bool(
        isinstance(summary, str)
        and summary.strip()
    )


def parse_report_date(value):
    if not value:
        return None

    if isinstance(value, date):
        return value

    try:
        return date.fromisoformat(str(value)[:10])
    except (ValueError, TypeError):
        return None


def get_handover_access(handover):
    access = handover.get("access_permissions") or {}

    if not isinstance(access, dict):
        return {}

    return access


def is_authorised_incoming_handover(handover, employee_id):
    """
    Incoming handovers are counted only when the current employee
    has active access to a shared handover report.
    """
    if handover.get("incoming_employee_id") != employee_id:
        return False

    if not handover.get("shared_at"):
        return False

    access = get_handover_access(handover)

    if access.get("incoming_employee_access") is not True:
        return False

    if access.get("status") == "revoked":
        return False

    if access.get("revoked_at"):
        return False

    permissions = access.get("permissions") or {}

    if not isinstance(permissions, dict):
        return False

    return permissions.get("viewReport") is True


def get_handover_report_status(handover):
    manager_approval = handover.get("manager_approval") or {}

    if not isinstance(manager_approval, dict):
        manager_approval = {}

    approval_status = manager_approval.get("status")
    handover_status = handover.get("status")

    if (
        approval_status == "changes_requested"
        or handover_status == "changes_requested"
    ):
        return "changes_requested"

    if (
        approval_status == "approved"
        or handover_status in ("approved", "shared")
    ):
        return "approved"

    return "pending"


def build_empty_employee_report(projects=None):
    return {
        "summary": {
            "projectsInvolved": len(projects or []),
            "workRecords": 0,
            "knowledgeCaptured": 0,
            "handoverParticipation": 0
        },
        "activityTrends": [],
        "projectEngagement": [],
        "knowledgeContributions": [],
        "workRecordRegister": [],
        "handoverSummary": {
            "approved": 0,
            "pending": 0,
            "changesRequested": 0
        },
        "outstandingWork": {
            "pendingTasks": 0,
            "blockers": 0,
            "dependencies": 0
        },
        "projects": projects or []
    }


def build_activity_trends(journals):
    """
    Groups activity by week for shorter reporting periods
    and by month for longer reporting periods.
    """
    grouped = defaultdict(
        lambda: {
            "journalEntries": 0,
            "completedTasks": 0
        }
    )

    dates = [
        parse_report_date(journal.get("entry_date"))
        for journal in journals
    ]

    valid_dates = [item for item in dates if item]

    if not valid_dates:
        return []

    date_span = (max(valid_dates) - min(valid_dates)).days
    use_months = date_span > 90

    for journal in journals:
        entry_date = parse_report_date(
            journal.get("entry_date")
        )

        if not entry_date:
            continue

        if use_months:
            key = entry_date.strftime("%Y-%m")
            label = entry_date.strftime("%b %Y")
        else:
            week_start = (
                entry_date
                - date.fromordinal(entry_date.toordinal())
                .__class__.fromordinal(
                    entry_date.toordinal()
                )
            )

            # Monday-based weekly grouping.
            week_start = date.fromordinal(
                entry_date.toordinal()
                - entry_date.weekday()
            )

            key = week_start.isoformat()
            label = week_start.strftime("%d %b")

        grouped[key]["label"] = label
        grouped[key]["journalEntries"] += 1
        grouped[key]["completedTasks"] += len(
            parse_json_list(
                journal.get("completed_tasks")
            )
        )

    return [
        {
            "label": values["label"],
            "journalEntries": values["journalEntries"],
            "completedTasks": values["completedTasks"]
        }
        for _, values in sorted(grouped.items())
    ]


# ---------------------------------------------------------
# Existing Manager Reports endpoint
# ---------------------------------------------------------

@router.get("/")
def get_reports_data(
    authenticated=Depends(get_authenticated_client)
):
    client, current_user = authenticated

    try:
        # Verify that the authenticated user is a manager.
        profile_response = (
            client.table("profiles")
            .select("id, name, email, role")
            .eq("id", current_user.id)
            .maybe_single()
            .execute()
        )

        manager_profile = profile_response.data

        if (
            not manager_profile
            or manager_profile.get("role") != "manager"
        ):
            raise HTTPException(
                status_code=403,
                detail="Only managers can access reports."
            )

        # Retrieve only projects owned by this manager.
        project_response = (
            client.table("projects")
            .select(
                "id, name, description, status, handover_status, "
                "created_by, created_at, updated_at, "
                "project_members("
                "id, user_id, role, designation, departing, joined_at"
                ")"
            )
            .eq("created_by", current_user.id)
            .order("created_at", desc=True)
            .execute()
        )

        database_projects = project_response.data or []

        if not database_projects:
            return {"projects": []}

        project_ids = [
            project["id"]
            for project in database_projects
        ]

        # Retrieve reporting records for these projects.
        journals_response = (
            client.table("journals")
            .select("*")
            .in_("project_id", project_ids)
            .order("entry_date", desc=True)
            .execute()
        )

        documents_response = (
            client.table("documents")
            .select("*")
            .in_("project_id", project_ids)
            .order("created_at", desc=True)
            .execute()
        )

        knowledge_response = (
            client.table("knowledge_items")
            .select("*")
            .in_("project_id", project_ids)
            .order("created_at", desc=True)
            .execute()
        )

        handovers_response = (
            client.table("handovers")
            .select("*")
            .in_("project_id", project_ids)
            .order("created_at", desc=True)
            .execute()
        )

        journals = journals_response.data or []
        documents = documents_response.data or []
        knowledge_items = knowledge_response.data or []
        handovers = handovers_response.data or []

        # Collect profile IDs for accurate contributor attribution.
        profile_ids = {
            current_user.id
        }

        for project in database_projects:
            for member in project.get("project_members", []):
                profile_ids.add(member["user_id"])

        for journal in journals:
            profile_ids.add(journal["employee_id"])

        for document in documents:
            profile_ids.add(document["uploaded_by"])

        for handover in handovers:
            if handover.get("outgoing_employee_id"):
                profile_ids.add(
                    handover["outgoing_employee_id"]
                )

            if handover.get("incoming_employee_id"):
                profile_ids.add(
                    handover["incoming_employee_id"]
                )

        profile_response = (
            client.table("profiles")
            .select("id, name, email, role")
            .in_("id", list(profile_ids))
            .execute()
        )

        profiles = {
            profile["id"]: profile
            for profile in (profile_response.data or [])
        }

        # Group records by project.
        journals_by_project = {}
        documents_by_project = {}
        knowledge_by_project = {}
        handovers_by_project = {}

        for journal in journals:
            journals_by_project.setdefault(
                journal["project_id"], []
            ).append(journal)

        for document in documents:
            documents_by_project.setdefault(
                document["project_id"], []
            ).append(document)

        for item in knowledge_items:
            knowledge_by_project.setdefault(
                item["project_id"], []
            ).append(item)

        for handover in handovers:
            handovers_by_project.setdefault(
                handover["project_id"], []
            ).append(handover)

        result = []

        for project in database_projects:
            project_id = project["id"]

            project_handovers = handovers_by_project.get(
                project_id, []
            )

            latest_handover = (
                project_handovers[0]
                if project_handovers
                else None
            )

            outgoing_id = (
                latest_handover.get("outgoing_employee_id")
                if latest_handover
                else None
            )

            members = []

            for member in project.get("project_members", []):
                member_id = member["user_id"]
                member_profile = profiles.get(member_id, {})
                member_role = member.get("role", "employee")

                members.append({
                    "id": member_id,
                    "name": member_profile.get(
                        "name", "Team member"
                    ),
                    "email": member_profile.get("email", ""),
                    "role": (
                        "Project Manager"
                        if member_role == "manager"
                        else "Employee"
                    ),
                    "designation": member.get("designation") or (
                        "Project Manager"
                        if member_role == "manager"
                        else "Team Member"
                    ),
                    "departing": (
                        member.get("departing", False)
                        or member_id == outgoing_id
                    )
                })

            # Format journal entries.
            project_journals = []

            for journal in journals_by_project.get(
                project_id, []
            ):
                employee_id = journal["employee_id"]
                author = profiles.get(employee_id, {})

                project_journals.append({
                    "id": journal["id"],
                    "date": journal.get("entry_date"),
                    "workSummary": journal.get(
                        "work_summary", ""
                    ),
                    "completedTasks": to_text(
                        journal.get("completed_tasks")
                    ),
                    "decisions": to_text(
                        journal.get("decisions")
                    ),
                    "blockers": to_text(
                        journal.get("blockers")
                    ),
                    "dependencies": to_text(
                        journal.get("dependencies")
                    ),
                    "pendingTasks": to_text(
                        journal.get("pending_tasks")
                    ),
                    "nextSteps": to_text(
                        journal.get("next_steps")
                    ),
                    "evidence": to_text(
                        journal.get("evidence")
                    ),
                    "createdBy": author.get(
                        "name", "Team member"
                    ),
                    "createdById": employee_id,
                    "createdAt": journal.get("created_at")
                })

            # Format uploaded documents.
            project_documents = []

            for document in documents_by_project.get(
                project_id, []
            ):
                uploader_id = document["uploaded_by"]
                uploader = profiles.get(uploader_id, {})
                size_bytes = document.get("size_bytes") or 0

                project_documents.append({
                    "id": document["id"],
                    "sourceId": document["id"],
                    "name": document["name"],
                    "type": (
                        document.get("file_type") or ""
                    ).upper(),
                    "sizeKb": round(size_bytes / 1024, 2),
                    "uploadedBy": uploader.get(
                        "name", "Team member"
                    ),
                    "uploadedById": uploader_id,
                    "uploadedAt": document.get("created_at")
                })

            # Format knowledge records.
            project_knowledge = []

            for item in knowledge_by_project.get(
                project_id, []
            ):
                source = item.get("source")

                project_knowledge.append({
                    "id": item["id"],
                    "type": item["item_type"],
                    "text": item["content"],
                    "source": (
                        source
                        if isinstance(source, dict)
                        else None
                    )
                })

            knowledge_summary = (
                " ".join(
                    item["content"]
                    for item in knowledge_by_project.get(
                        project_id, []
                    )[:3]
                )
                if project_knowledge
                else "No knowledge items recorded yet."
            )

            # Format handover records.
            formatted_handovers = []

            for handover in project_handovers:
                outgoing_id = handover.get(
                    "outgoing_employee_id"
                )
                incoming_id = handover.get(
                    "incoming_employee_id"
                )

                outgoing = profiles.get(
                    outgoing_id, {}
                ) if outgoing_id else {}

                incoming = profiles.get(
                    incoming_id, {}
                ) if incoming_id else {}

                formatted_handovers.append({
                    "id": handover["id"],
                    "outgoingEmployeeId": outgoing_id,
                    "outgoingEmployeeName": outgoing.get(
                        "name", "Team member"
                    ),
                    "incomingEmployeeId": incoming_id,
                    "incomingEmployeeName": incoming.get(
                        "name", ""
                    ),
                    "report": handover.get("report") or {},
                    "employeeConfirmation": (
                        handover.get(
                            "employee_confirmation"
                        ) or {}
                    ),
                    "managerApproval": (
                        handover.get(
                            "manager_approval"
                        ) or {}
                    ),
                    "accessPermissions": (
                        handover.get(
                            "access_permissions"
                        ) or {}
                    ),
                    "status": handover.get("status"),
                    "sharedAt": handover.get("shared_at"),
                    "createdAt": handover.get("created_at"),
                    "updatedAt": handover.get("updated_at")
                })

            result.append({
                "id": project_id,
                "name": project["name"],
                "description": project.get("description") or "",
                "status": project["status"],
                "handoverStatus": (
                    get_handover_status(latest_handover)
                    if latest_handover
                    else project.get(
                        "handover_status", "not_started"
                    )
                ),
                "createdAt": project.get("created_at"),
                "updatedAt": project.get("updated_at"),
                "members": members,
                "journalEntries": project_journals,
                "documents": project_documents,
                "knowledge": {
                    "summary": knowledge_summary,
                    "items": project_knowledge
                },
                "handovers": formatted_handovers
            })

        return {
            "projects": result
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Reports retrieval error:", error)

        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve reports data."
        )


# ---------------------------------------------------------
# New Employee Reports & Analytics endpoint
# ---------------------------------------------------------

@router.get("/employee")
def get_employee_reports(
    project_id: str = Query(default=None),
    start_date: str = Query(default=None),
    end_date: str = Query(default=None),
    authenticated=Depends(get_authenticated_client)
):
    client, current_user = authenticated

    try:
        # Verify the authenticated user's employee role.
        profile_response = (
            client.table("profiles")
            .select("id, role")
            .eq("id", current_user.id)
            .maybe_single()
            .execute()
        )

        profile = profile_response.data

        if not profile or profile.get("role") != "employee":
            raise HTTPException(
                status_code=403,
                detail="Only employees can access employee reports."
            )

        employee_id = current_user.id

        # Validate date filters.
        parsed_start_date = None
        parsed_end_date = None

        if start_date:
            try:
                parsed_start_date = date.fromisoformat(start_date)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid start_date. Use YYYY-MM-DD."
                )

        if end_date:
            try:
                parsed_end_date = date.fromisoformat(end_date)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid end_date. Use YYYY-MM-DD."
                )

        if (
            parsed_start_date
            and parsed_end_date
            and parsed_start_date > parsed_end_date
        ):
            raise HTTPException(
                status_code=400,
                detail="start_date cannot be after end_date."
            )

        # Retrieve the projects assigned to this employee.
        membership_response = (
            client.table("project_members")
            .select("project_id")
            .eq("user_id", employee_id)
            .execute()
        )

        assigned_project_ids = list({
            member["project_id"]
            for member in (membership_response.data or [])
            if member.get("project_id")
        })

        if not assigned_project_ids:
            return build_empty_employee_report()

        # Retrieve all assigned project choices.
        projects_response = (
            client.table("projects")
            .select("id, name")
            .in_("id", assigned_project_ids)
            .order("name")
            .execute()
        )

        assigned_projects = projects_response.data or []

        project_options = [
            {
                "id": project["id"],
                "name": project["name"]
            }
            for project in assigned_projects
        ]

        accessible_project_ids = {
            project["id"]
            for project in assigned_projects
        }

        # Validate the requested project filter.
        selected_project_ids = list(accessible_project_ids)

        if project_id:
            if project_id not in accessible_project_ids:
                raise HTTPException(
                    status_code=403,
                    detail="You do not have access to this project."
                )

            selected_project_ids = [project_id]

        if not selected_project_ids:
            return build_empty_employee_report(project_options)

        # Retrieve only the authenticated employee's journals.
        journals_query = (
            client.table("journals")
            .select(
                "id, project_id, employee_id, work_summary, "
                "completed_tasks, decisions, blockers, "
                "dependencies, pending_tasks, next_steps, "
                "entry_date, created_at"
            )
            .eq("employee_id", employee_id)
            .in_("project_id", selected_project_ids)
        )

        if parsed_start_date:
            journals_query = journals_query.gte(
                "entry_date",
                parsed_start_date.isoformat()
            )

        if parsed_end_date:
            journals_query = journals_query.lte(
                "entry_date",
                parsed_end_date.isoformat()
            )

        journals_response = (
            journals_query
            .order("entry_date", desc=False)
            .execute()
        )

        journals = journals_response.data or []

        # Aggregate journal contribution counts.
        completed_tasks = 0
        decisions = 0
        blockers = 0
        dependencies = 0
        pending_tasks = 0
        next_steps = 0
        work_summaries = 0

        for journal in journals:
            completed_tasks += len(
                parse_json_list(journal.get("completed_tasks"))
            )
            decisions += len(
                parse_json_list(journal.get("decisions"))
            )
            blockers += len(
                parse_json_list(journal.get("blockers"))
            )
            dependencies += len(
                parse_json_list(journal.get("dependencies"))
            )
            pending_tasks += len(
                parse_json_list(journal.get("pending_tasks"))
            )
            next_steps += len(
                parse_json_list(journal.get("next_steps"))
            )

            if get_non_empty_summary(journal):
                work_summaries += 1

        knowledge_captured = (
            work_summaries
            + completed_tasks
            + decisions
            + blockers
            + dependencies
            + pending_tasks
            + next_steps
        )

        # Project engagement is based only on the employee's journals.
        project_names = {
            project["id"]: project["name"]
            for project in assigned_projects
        }

        project_record_counts = defaultdict(int)

        for journal in journals:
            project_record_counts[journal["project_id"]] += 1

        project_engagement = [
            {
                "projectName": project_names.get(
                    selected_id,
                    "Project"
                ),
                "workRecords": project_record_counts.get(
                    selected_id,
                    0
                )
            }
            for selected_id in selected_project_ids
        ]

        # Knowledge contribution categories.
        knowledge_contributions = [
            {
                "label": "Completed work",
                "count": completed_tasks
            },
            {
                "label": "Decisions",
                "count": decisions
            },
            {
                "label": "Blockers",
                "count": blockers
            },
            {
                "label": "Dependencies",
                "count": dependencies
            },
            {
                "label": "Pending tasks",
                "count": pending_tasks
            },
            {
                "label": "Next steps",
                "count": next_steps
            }
        ]

        # Work record register.
        work_record_register = [
            {
                "category": "Work summaries",
                "count": work_summaries,
                "icon": "fileText"
            },
            {
                "category": "Completed tasks",
                "count": completed_tasks,
                "icon": "checkCircle"
            },
            {
                "category": "Decisions",
                "count": decisions,
                "icon": "brain"
            },
            {
                "category": "Blockers",
                "count": blockers,
                "icon": "alertTriangle"
            },
            {
                "category": "Dependencies",
                "count": dependencies,
                "icon": "network"
            },
            {
                "category": "Pending tasks",
                "count": pending_tasks,
                "icon": "clock"
            },
            {
                "category": "Next steps",
                "count": next_steps,
                "icon": "listChecks"
            }
        ]

        # Retrieve handovers for the employee's accessible projects.
        handovers_response = (
            client.table("handovers")
            .select(
                "id, project_id, outgoing_employee_id, "
                "incoming_employee_id, status, shared_at, "
                "employee_confirmation, manager_approval, "
                "access_permissions, created_at, updated_at"
            )
            .in_("project_id", selected_project_ids)
            .execute()
        )

        all_handovers = handovers_response.data or []

        employee_handovers = []

        for handover in all_handovers:
            is_outgoing = (
                handover.get("outgoing_employee_id")
                == employee_id
            )

            is_incoming = is_authorised_incoming_handover(
                handover,
                employee_id
            )

            if is_outgoing or is_incoming:
                employee_handovers.append(handover)

        handover_summary = {
            "approved": 0,
            "pending": 0,
            "changesRequested": 0
        }

        for handover in employee_handovers:
            status = get_handover_report_status(handover)

            if status == "approved":
                handover_summary["approved"] += 1

            elif status == "changes_requested":
                handover_summary["changesRequested"] += 1

            else:
                handover_summary["pending"] += 1

        # Build final response.
        return {
            "summary": {
                "projectsInvolved": len({
                    journal["project_id"]
                    for journal in journals
                }),
                "workRecords": len(journals),
                "knowledgeCaptured": knowledge_captured,
                "handoverParticipation": len(employee_handovers)
            },
            "activityTrends": build_activity_trends(journals),
            "projectEngagement": project_engagement,
            "knowledgeContributions": knowledge_contributions,
            "workRecordRegister": work_record_register,
            "handoverSummary": handover_summary,
            "outstandingWork": {
                "pendingTasks": pending_tasks,
                "blockers": blockers,
                "dependencies": dependencies
            },
            "projects": project_options
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Employee reports retrieval error:", error)

        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve employee reports."
        )
