
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client

from config import SUPABASE_URL, SUPABASE_KEY


router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit & Version History"]
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


def normalize_datetime(value: datetime) -> datetime:
    """
    Normalize datetime values to UTC for safe comparison.
    Naive datetime values are interpreted as UTC.
    """
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def format_audit_record(record, project_names, actor_profiles):
    actor_id = record.get("actor_id")
    project_id = record.get("project_id")

    actor = actor_profiles.get(actor_id, {})

    return {
        "id": record.get("id"),
        "projectId": project_id,
        "projectName": project_names.get(
            project_id,
            "Unknown project"
        ),
        "actorId": actor_id,
        "actorName": actor.get("name") or "Unknown user",
        "actorEmail": actor.get("email") or "",
        "actionType": record.get("action_type"),
        "entityType": record.get("entity_type"),
        "entityId": record.get("entity_id"),
        "description": record.get("description"),
        "oldValues": record.get("old_values") or {},
        "newValues": record.get("new_values") or {},
        "metadata": record.get("metadata") or {},
        "createdAt": record.get("created_at"),
    }


@router.get("/")
def get_audit_logs(
    project_id: Optional[str] = None,
    action_type: Optional[str] = None,
    entity_type: Optional[str] = None,
    search: Optional[str] = Query(default=None, max_length=100),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    authenticated=Depends(get_authenticated_client),
):
    client, current_user = authenticated

    # Validate the requested date range.
    if date_from and date_to:
        if normalize_datetime(date_from) > normalize_datetime(date_to):
            raise HTTPException(
                status_code=422,
                detail="The start date cannot be later than the end date."
            )

    # Normalize optional filters.
    project_id = project_id.strip() if project_id else None
    action_type = action_type.strip() if action_type else None
    entity_type = entity_type.strip() if entity_type else None
    search = search.strip() if search else None

    try:
        # -----------------------------------------
        # 1. Verify the authenticated user's role
        # -----------------------------------------

        profile_response = (
            client.table("profiles")
            .select("id, name, email, role")
            .eq("id", current_user.id)
            .maybe_single()
            .execute()
        )

        profile = profile_response.data

        if not profile or profile.get("role") != "manager":
            raise HTTPException(
                status_code=403,
                detail="Only managers can access audit records."
            )

        # -----------------------------------------
        # 2. Retrieve projects owned by this manager
        # -----------------------------------------

        projects_response = (
            client.table("projects")
            .select("id, name")
            .eq("created_by", current_user.id)
            .execute()
        )

        owned_projects = projects_response.data or []

        project_names = {
            item["id"]: item["name"]
            for item in owned_projects
        }

        owned_project_ids = list(project_names.keys())

        # -----------------------------------------
        # 3. Validate project access
        # -----------------------------------------

        if project_id:
            if project_id not in owned_project_ids:
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "You are not authorised to view "
                        "this project's audit history."
                    )
                )

            selected_project_ids = [project_id]

        else:
            selected_project_ids = owned_project_ids

        if not selected_project_ids:
            return {
                "logs": [],
                "total": 0,
                "limit": limit,
                "offset": offset,
            }

        # -----------------------------------------
        # 4. Build the audit query
        # -----------------------------------------

        query = (
            client.table("audit_logs")
            .select(
                "id, project_id, actor_id, action_type, "
                "entity_type, entity_id, description, "
                "old_values, new_values, metadata, created_at",
                count="exact"
            )
            .in_("project_id", selected_project_ids)
            .order("created_at", desc=True)
        )

        if action_type:
            query = query.eq("action_type", action_type)

        if entity_type:
            query = query.eq("entity_type", entity_type)

        if search:
            query = query.ilike(
                "description",
                f"%{search}%"
            )

        if date_from:
            query = query.gte(
                "created_at",
                date_from.isoformat()
            )

        if date_to:
            query = query.lte(
                "created_at",
                date_to.isoformat()
            )

        # -----------------------------------------
        # 5. Apply pagination
        # -----------------------------------------

        response = (
            query
            .range(offset, offset + limit - 1)
            .execute()
        )

        records = response.data or []

        # -----------------------------------------
        # 6. Resolve actor profiles
        # -----------------------------------------

        actor_ids = list({
            record["actor_id"]
            for record in records
            if record.get("actor_id")
        })

        actor_profiles = {}

        if actor_ids:
            actor_response = (
                client.table("profiles")
                .select("id, name, email")
                .in_("id", actor_ids)
                .execute()
            )

            actor_profiles = {
                item["id"]: item
                for item in (actor_response.data or [])
            }

        # -----------------------------------------
        # 7. Format the response
        # -----------------------------------------

        formatted_logs = [
            format_audit_record(
                record,
                project_names,
                actor_profiles
            )
            for record in records
        ]

        return {
            "logs": formatted_logs,
            "total": response.count or 0,
            "limit": limit,
            "offset": offset,
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to retrieve audit records. "
                "Please try again."
            )
        )
