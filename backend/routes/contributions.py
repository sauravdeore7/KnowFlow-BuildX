
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client

from config import SUPABASE_URL, SUPABASE_KEY


router = APIRouter(
    prefix="/contributions",
    tags=["Employee Contribution Analytics"]
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


def split_text_items(value):
    if not value:
        return []

    if isinstance(value, list):
        values = value
    else:
        values = str(value).replace("\r", "\n").split("\n")

    return [
        cleaned
        for item in values
        if item is not None
        and (cleaned := str(item).strip().lstrip("-•* ").strip())
    ]


def parse_date(value):
    if not value:
        return None

    try:
        return date.fromisoformat(str(value)[:10])
    except (ValueError, TypeError):
        return None


def get_period_key(entry_date, period):
    if period == "monthly":
        return entry_date.strftime("%Y-%m")

    iso_year, iso_week, _ = entry_date.isocalendar()

    return f"{iso_year}-W{iso_week:02d}"


def get_period_label(entry_date, period):
    if period == "monthly":
        return entry_date.strftime("%b %Y")

    iso_year, iso_week, _ = entry_date.isocalendar()

    return f"Week {iso_week}, {iso_year}"


def empty_response(period, projects=None):
    return {
        "summary": {
            "projectsInvolved": 0,
            "activeDays": 0,
            "decisionsRecorded": 0,
            "knowledgeAdded": 0
        },
        "activityTrends": [],
        "projectInvolvement": [],
        "workBreakdown": [],
        "workBreakdownAvailable": False,
        "workBreakdownMessage": (
            "Work categories are not currently recorded "
            "in journal entries. Category percentages are "
            "therefore not estimated."
        ),
        "milestones": [],
        "projects": projects or [],
        "period": period
    }


@router.get("/")
def get_employee_contributions(
    period: str = Query(
        "weekly",
        pattern="^(weekly|monthly)$"
    ),
    project_id: Optional[str] = Query(default=None),
    authenticated=Depends(get_authenticated_client)
):
    client, current_user = authenticated
    employee_id = str(current_user.id)

    try:
        # Verify the authenticated user's employee profile.
        profile_response = (
            client.table("profiles")
            .select("id, name, role")
            .eq("id", employee_id)
            .maybe_single()
            .execute()
        )

        profile = profile_response.data

        if not profile or profile.get("role") != "employee":
            raise HTTPException(
                status_code=403,
                detail="Only employees can access contribution analytics."
            )

        # Retrieve only projects assigned to this employee.
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
            return empty_response(period)

        # Fetch project details for assigned projects.
        projects_response = (
            client.table("projects")
            .select("id, name, status, created_at")
            .in_("id", assigned_project_ids)
            .order("created_at", desc=True)
            .execute()
        )

        assigned_projects = projects_response.data or []

        project_map = {
            project["id"]: project
            for project in assigned_projects
        }

        # Keep all assigned projects available for the frontend filter.
        project_options = [
            {
                "id": project["id"],
                "name": project["name"],
                "status": project.get("status")
            }
            for project in assigned_projects
        ]

        # Apply optional project filter to analytics data.
        selected_project_ids = set(assigned_project_ids)

        if project_id:
            if project_id not in selected_project_ids:
                raise HTTPException(
                    status_code=403,
                    detail="You are not assigned to this project."
                )

            selected_project_ids = {project_id}

        selected_ids = list(selected_project_ids)

        if not selected_ids:
            return empty_response(period, project_options)

        # Retrieve only this employee's journal entries.
        journals_response = (
            client.table("journals")
            .select("*")
            .eq("employee_id", employee_id)
            .in_("project_id", selected_ids)
            .order("entry_date", desc=True)
            .execute()
        )

        journals = journals_response.data or []

        journal_ids = {
            journal["id"]
            for journal in journals
        }

        # Retrieve only documents uploaded by this employee.
        documents_response = (
            client.table("documents")
            .select("id, project_id, name, file_type, created_at")
            .eq("uploaded_by", employee_id)
            .in_("project_id", selected_ids)
            .order("created_at", desc=True)
            .execute()
        )

        documents = documents_response.data or []

        document_map = {
            document["id"]: document
            for document in documents
        }

        # Retrieve project knowledge and attribute it through
        # its original journal or document source.
        knowledge_response = (
            client.table("knowledge_items")
            .select("id, project_id, item_type, content, source, created_at")
            .in_("project_id", selected_ids)
            .execute()
        )

        all_knowledge = knowledge_response.data or []

        employee_knowledge = []

        for item in all_knowledge:
            source = item.get("source")

            if not isinstance(source, dict):
                continue

            source_type = source.get("source_type")

            if source_type == "journal":
                source_employee_id = source.get("employee_id")
                source_journal_id = source.get("journal_id")

                if (
                    source_employee_id == employee_id
                    or source_journal_id in journal_ids
                ):
                    employee_knowledge.append(item)

            elif source_type == "document":
                source_document_id = source.get("document_id")

                if source_document_id in document_map:
                    employee_knowledge.append(item)

        # Calculate distinct active days and decisions.
        active_dates = set()
        decisions_count = 0

        journal_activity = []

        for journal in journals:
            entry_date = parse_date(journal.get("entry_date"))

            if entry_date:
                active_dates.add(entry_date)

            decisions = split_text_items(
                journal.get("decisions")
            )

            decisions_count += len(decisions)

            journal_activity.append({
                "journal": journal,
                "entry_date": entry_date,
                "decisions": decisions
            })

        # Group knowledge by its original source date.
        knowledge_by_date = {}

        for item in employee_knowledge:
            source = item.get("source") or {}

            source_date = parse_date(
                source.get("entry_date")
            )

            if not source_date:
                document = document_map.get(
                    source.get("document_id")
                )

                if document:
                    source_date = parse_date(
                        document.get("created_at")
                    )

            if source_date:
                knowledge_by_date[source_date] = (
                    knowledge_by_date.get(source_date, 0) + 1
                )

        # Build activity trends.
        trend_map = {}

        for activity in journal_activity:
            entry_date = activity["entry_date"]

            if not entry_date:
                continue

            key = get_period_key(entry_date, period)

            if key not in trend_map:
                trend_map[key] = {
                    "period": key,
                    "label": get_period_label(entry_date, period),
                    "activeDates": set(),
                    "journalEntries": 0,
                    "decisionsRecorded": 0,
                    "knowledgeAdded": 0
                }

            trend = trend_map[key]

            trend["activeDates"].add(entry_date)
            trend["journalEntries"] += 1
            trend["decisionsRecorded"] += len(
                activity["decisions"]
            )

        for entry_date, count in knowledge_by_date.items():
            key = get_period_key(entry_date, period)

            if key not in trend_map:
                trend_map[key] = {
                    "period": key,
                    "label": get_period_label(entry_date, period),
                    "activeDates": set(),
                    "journalEntries": 0,
                    "decisionsRecorded": 0,
                    "knowledgeAdded": 0
                }

            trend_map[key]["knowledgeAdded"] += count

        activity_trends = []

        for key in sorted(trend_map.keys()):
            trend = trend_map[key]

            activity_trends.append({
                "period": trend["period"],
                "label": trend["label"],
                "activeDays": len(trend["activeDates"]),
                "journalEntries": trend["journalEntries"],
                "decisionsRecorded": trend["decisionsRecorded"],
                "knowledgeAdded": trend["knowledgeAdded"]
            })

        # Build project-wise personal involvement.
        project_involvement = []

        for selected_id in selected_ids:
            project = project_map.get(selected_id)

            if not project:
                continue

            project_journals = [
                journal
                for journal in journals
                if journal["project_id"] == selected_id
            ]

            project_documents = [
                document
                for document in documents
                if document["project_id"] == selected_id
            ]

            project_knowledge = [
                item
                for item in employee_knowledge
                if item["project_id"] == selected_id
            ]

            project_dates = {
                parsed_date
                for journal in project_journals
                if (parsed_date := parse_date(
                    journal.get("entry_date")
                ))
            }

            project_decisions = sum(
                len(split_text_items(journal.get("decisions")))
                for journal in project_journals
            )

            project_involvement.append({
                "projectId": selected_id,
                "projectName": project["name"],
                "status": project.get("status"),
                "journalEntries": len(project_journals),
                "activeDays": len(project_dates),
                "decisionsRecorded": project_decisions,
                "knowledgeAdded": len(project_knowledge),
                "documentsUploaded": len(project_documents)
            })

        project_involvement.sort(
            key=lambda item: (
                item["journalEntries"],
                item["knowledgeAdded"]
            ),
            reverse=True
        )

        # Count only projects with actual recorded contributions.
        projects_involved = sum(
            1
            for project in project_involvement
            if (
                project["journalEntries"] > 0
                or project["knowledgeAdded"] > 0
                or project["documentsUploaded"] > 0
            )
        )

        # Build a concise milestone timeline from completed tasks.
        milestones = []
        seen_milestones = set()

        sorted_journals = sorted(
            journal_activity,
            key=lambda item: item["entry_date"] or date.min,
            reverse=True
        )

        for activity in sorted_journals:
            journal = activity["journal"]

            completed_tasks = split_text_items(
                journal.get("completed_tasks")
            )

            for task_index, task in enumerate(completed_tasks):
                normalized_task = task.casefold()

                if normalized_task in seen_milestones:
                    continue

                seen_milestones.add(normalized_task)

                project = project_map.get(
                    journal["project_id"], {}
                )

                milestones.append({
                    "id": f"{journal['id']}-{task_index}",
                    "title": task,
                    "type": "completed_task",
                    "date": journal.get("entry_date"),
                    "projectId": journal["project_id"],
                    "projectName": project.get(
                        "name", "Project"
                    )
                })

                if len(milestones) >= 8:
                    break

            if len(milestones) >= 8:
                break

        return {
            "summary": {
                "projectsInvolved": projects_involved,
                "activeDays": len(active_dates),
                "decisionsRecorded": decisions_count,
                "knowledgeAdded": len(employee_knowledge)
            },
            "activityTrends": activity_trends,
            "projectInvolvement": project_involvement,
            "workBreakdown": [],
            "workBreakdownAvailable": False,
            "workBreakdownMessage": (
                "Work categories are not currently recorded "
                "in journal entries. Category percentages "
                "are therefore not estimated."
            ),
            "milestones": milestones,
            "projects": project_options,
            "period": period
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Contribution analytics error:", error)

        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve contribution analytics."
        )
