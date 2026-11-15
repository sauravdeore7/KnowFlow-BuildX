
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client

from config import SUPABASE_URL, SUPABASE_KEY


router = APIRouter(
    prefix="/knowledge-portfolio",
    tags=["Knowledge Portfolio"]
)

security = HTTPBearer(auto_error=False)


def get_authenticated_client(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )

    token = credentials.credentials

    try:
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        auth_response = client.auth.get_user(token)

        if not auth_response.user:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired session"
            )

        client.postgrest.auth(token)

        return client, auth_response.user

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired session"
        )


def safe_source(item, journal_ids, document_map, employee_id):
    source = item.get("source")

    if not isinstance(source, dict):
        return None

    source_type = source.get("source_type")

    if source_type == "journal":
        journal_id = source.get("journal_id")

        belongs_to_employee = (
            str(source.get("employee_id") or "") == employee_id
            or str(journal_id or "") in journal_ids
        )

        if not belongs_to_employee:
            return None

        journal = journal_ids.get(str(journal_id), {})

        return {
            "source_type": "journal",
            "journal_id": journal_id,
            "entry_date": (
                source.get("entry_date")
                or journal.get("entry_date")
            ),
            "field": source.get("field")
        }

    if source_type == "document":
        document_id = str(source.get("document_id") or "")

        document = document_map.get(document_id)

        if not document:
            return None

        return {
            "source_type": "document",
            "document_id": document_id,
            "document_name": document.get("name")
            or source.get("document_name")
        }

    return None


@router.get("/")
def get_knowledge_portfolio(
    authenticated=Depends(get_authenticated_client)
):
    client, current_user = authenticated
    employee_id = str(current_user.id)

    try:
        # Verify the employee's account role.
        profile_response = (
            client.table("profiles")
            .select("id, name, email, role")
            .eq("id", employee_id)
            .maybe_single()
            .execute()
        )

        profile = profile_response.data

        if not profile or profile.get("role") != "employee":
            raise HTTPException(
                status_code=403,
                detail="Knowledge Portfolio is available to employees only"
            )

        # Retrieve the employee's assigned projects.
        membership_response = (
            client.table("project_members")
            .select("project_id, role, designation, joined_at")
            .eq("user_id", employee_id)
            .execute()
        )

        memberships = membership_response.data or []

        project_ids = list({
            str(member["project_id"])
            for member in memberships
            if member.get("project_id")
        })

        if not project_ids:
            return {
                "profile": profile,
                "summary": {
                    "total_projects": 0,
                    "total_journals": 0,
                    "total_documents": 0,
                    "total_knowledge_items": 0,
                    "knowledge_by_type": {}
                },
                "projects": [],
                "knowledge": [],
                "journals": [],
                "documents": [],
                "handover_context": []
            }

        # Retrieve project information.
        projects_response = (
            client.table("projects")
            .select("id, name, description, status, created_at")
            .in_("id", project_ids)
            .execute()
        )

        projects = projects_response.data or []

        project_map = {
            str(project["id"]): project
            for project in projects
        }

        portfolio_projects = []

        for member in memberships:
            project = project_map.get(str(member["project_id"]))

            if not project:
                continue

            portfolio_projects.append({
                "id": project["id"],
                "name": project["name"],
                "description": project.get("description"),
                "status": project.get("status"),
                "created_at": project.get("created_at"),
                "designation": member.get("designation"),
                "joined_at": member.get("joined_at"),
                "membership_role": member.get("role")
            })

        # Retrieve only this employee's journals.
        journals_response = (
            client.table("journals")
            .select(
                "id, project_id, work_summary, completed_tasks, "
                "decisions, blockers, dependencies, pending_tasks, "
                "next_steps, entry_date, created_at"
            )
            .eq("employee_id", employee_id)
            .in_("project_id", project_ids)
            .order("entry_date", desc=True)
            .execute()
        )

        journals = journals_response.data or []

        journal_map = {
            str(journal["id"]): journal
            for journal in journals
        }

        # Retrieve only documents uploaded by this employee.
        documents_response = (
            client.table("documents")
            .select(
                "id, project_id, name, file_type, "
                "size_bytes, created_at"
            )
            .eq("uploaded_by", employee_id)
            .in_("project_id", project_ids)
            .order("created_at", desc=True)
            .execute()
        )

        documents = documents_response.data or []

        document_map = {
            str(document["id"]): document
            for document in documents
        }

        # Retrieve project knowledge and apply employee attribution.
        knowledge_response = (
            client.table("knowledge_items")
            .select(
                "id, project_id, item_type, content, source, created_at"
            )
            .in_("project_id", project_ids)
            .order("created_at", desc=True)
            .execute()
        )

        knowledge_items = knowledge_response.data or []

        employee_knowledge = []

        knowledge_by_type = {}

        for item in knowledge_items:
            source = safe_source(
                item,
                journal_map,
                document_map,
                employee_id
            )

            if not source:
                continue

            project_id = str(item["project_id"])
            project = project_map.get(project_id)

            item_type = item.get("item_type", "other")

            employee_knowledge.append({
                "id": item["id"],
                "project_id": item["project_id"],
                "project_name": (
                    project.get("name") if project else None
                ),
                "item_type": item_type,
                "content": item.get("content"),
                "source": source,
                "created_at": item.get("created_at")
            })

            knowledge_by_type[item_type] = (
                knowledge_by_type.get(item_type, 0) + 1
            )

        # Retrieve only handovers involving this employee.
        handover_response = (
            client.table("handovers")
            .select(
                "id, project_id, outgoing_employee_id, "
                "incoming_employee_id, status, manager_approval, "
                "created_at, shared_at"
            )
            .in_("project_id", project_ids)
            .execute()
        )

        handovers = handover_response.data or []

        handover_context = []

        for handover in handovers:
            outgoing_id = str(
                handover.get("outgoing_employee_id") or ""
            )

            incoming_id = str(
                handover.get("incoming_employee_id") or ""
            )

            if employee_id not in [outgoing_id, incoming_id]:
                continue

            approval = handover.get("manager_approval")

            if not isinstance(approval, dict):
                approval = {}

            project = project_map.get(
                str(handover["project_id"])
            )

            handover_context.append({
                "id": handover["id"],
                "project_id": handover["project_id"],
                "project_name": (
                    project.get("name") if project else None
                ),
                "relationship": (
                    "outgoing" if outgoing_id == employee_id
                    else "incoming"
                ),
                "status": handover.get("status"),
                "manager_approval_status": approval.get("status"),
                "created_at": handover.get("created_at"),
                "shared_at": handover.get("shared_at")
            })

        return {
            "profile": profile,
            "summary": {
                "total_projects": len(portfolio_projects),
                "total_journals": len(journals),
                "total_documents": len(documents),
                "total_knowledge_items": len(employee_knowledge),
                "knowledge_by_type": knowledge_by_type
            },
            "projects": portfolio_projects,
            "knowledge": employee_knowledge,
            "journals": journals,
            "documents": documents,
            "handover_context": handover_context
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Knowledge Portfolio error:", error)

        raise HTTPException(
            status_code=500,
            detail="Unable to load Knowledge Portfolio"
        )
