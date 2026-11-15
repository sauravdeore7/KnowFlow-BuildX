from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from supabase import create_client

from config import SUPABASE_URL, SUPABASE_KEY


router = APIRouter(prefix="/handovers", tags=["Handovers"])
security = HTTPBearer()


class CreateHandoverRequest(BaseModel):
    project_id: str
    comments: Optional[str] = Field(default=None, max_length=2000)


class ConfirmationRequest(BaseModel):
    comments: Optional[str] = None


class ApprovalRequest(BaseModel):
    good_wishes: str


class ChangesRequest(BaseModel):
    feedback: str


class ShareRequest(BaseModel):
    incoming_employee_id: str
    permissions: dict


def get_authenticated_client(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    try:
        auth_response = client.auth.get_user(token)

        if not auth_response.user:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired authentication token.",
            )

        client.postgrest.auth(token)

        return client, auth_response.user

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token.",
        )


def get_manager_handover(client, current_user, handover_id):
    profile_response = (
        client.table("profiles")
        .select("id, name, email, role")
        .eq("id", current_user.id)
        .execute()
    )

    profiles = profile_response.data or []

    if not profiles or profiles[0].get("role") != "manager":
        raise HTTPException(
            status_code=403,
            detail="Only project managers can perform this action.",
        )

    handover_response = (
        client.table("handovers")
        .select("*")
        .eq("id", handover_id)
        .execute()
    )

    handovers = handover_response.data or []

    if not handovers:
        raise HTTPException(
            status_code=404,
            detail="Handover record not found.",
        )

    handover = handovers[0]

    project_response = (
        client.table("projects")
        .select("id, created_by")
        .eq("id", handover["project_id"])
        .execute()
    )

    projects = project_response.data or []

    if not projects or projects[0]["created_by"] != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You are not authorised to manage this handover.",
        )

    return handover, profiles[0]


def update_handover(client, handover_id, changes):
    response = (
        client.table("handovers")
        .update(changes)
        .eq("id", handover_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=400,
            detail="The handover could not be updated.",
        )

    return response.data[0]


# --------------------------------------------------
# CREATE HANDOVER - EMPLOYEE
# --------------------------------------------------

@router.post("/create")
def create_handover(
    request: CreateHandoverRequest,
    authenticated=Depends(get_authenticated_client),
):
    client, current_user = authenticated

    try:
        result = client.rpc(
            "create_handover",
            {
                "p_project_id": request.project_id,
                "p_comments": request.comments,
            },
        ).execute()

        handover = result.data

        if isinstance(handover, list):
            handover = handover[0] if handover else None

        if not handover:
            raise HTTPException(
                status_code=500,
                detail="The server did not return the created handover.",
            )

        return {
            "message": "Handover created successfully.",
            "handover": handover,
        }

    except HTTPException:
        raise

    except Exception as error:
        error_message = str(error).lower()

        print("Handover creation error:", error)

        if "active handover already exists" in error_message:
            raise HTTPException(
                status_code=409,
                detail="An active handover already exists for this project.",
            )

        if "not an employee assigned" in error_message:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this project as an employee.",
            )

        if "only employees" in error_message:
            raise HTTPException(
                status_code=403,
                detail="Only employees can create handovers.",
            )

        if "authentication required" in error_message:
            raise HTTPException(
                status_code=401,
                detail="Authentication is required to create a handover.",
            )

        raise HTTPException(
            status_code=500,
            detail="Unable to create handover. Please try again.",
        )


# --------------------------------------------------
# EMPLOYEE CONFIRMATION
# --------------------------------------------------

@router.post("/{handover_id}/confirm")
def confirm_handover(
    handover_id: str,
    request: ConfirmationRequest,
    authenticated=Depends(get_authenticated_client),
):
    client, current_user = authenticated

    try:
        result = client.rpc(
            "confirm_handover",
            {
                "p_handover_id": handover_id,
                "p_comments": request.comments,
            },
        ).execute()

        return {
            "message": "Handover confirmation submitted successfully.",
            "handover": result.data,
        }

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# --------------------------------------------------
# MANAGER APPROVAL
# --------------------------------------------------

@router.post("/{handover_id}/approve")
def approve_handover(
    handover_id: str,
    request: ApprovalRequest,
    authenticated=Depends(get_authenticated_client),
):
    client, current_user = authenticated

    try:
        handover, manager = get_manager_handover(
            client, current_user, handover_id
        )

        confirmation = handover.get("employee_confirmation") or {}

        if (
            not confirmation.get("confirmed_at")
            and confirmation.get("status") != "confirmed"
        ):
            raise HTTPException(
                status_code=400,
                detail="The outgoing employee must confirm the handover first.",
            )

        if not request.good_wishes.strip():
            raise HTTPException(
                status_code=400,
                detail="Please provide a good-wishes message.",
            )

        now = datetime.now(timezone.utc).isoformat()

        manager_approval = {
            "status": "approved",
            "approved_at": now,
            "approved_by": current_user.id,
            "comments": None,
            "good_wishes": request.good_wishes.strip(),
        }

        updated = update_handover(
            client,
            handover_id,
            {
                "manager_approval": manager_approval,
                "status": "approved",
                "updated_at": now,
            },
        )

        return {
            "message": "Handover approved successfully.",
            "handover": updated,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# --------------------------------------------------
# MANAGER REQUESTS CHANGES
# --------------------------------------------------

@router.post("/{handover_id}/request-changes")
def request_handover_changes(
    handover_id: str,
    request: ChangesRequest,
    authenticated=Depends(get_authenticated_client),
):
    client, current_user = authenticated

    try:
        handover, manager = get_manager_handover(
            client, current_user, handover_id
        )

        if not request.feedback.strip():
            raise HTTPException(
                status_code=400,
                detail="Please describe the changes required.",
            )

        now = datetime.now(timezone.utc).isoformat()

        manager_approval = {
            "status": "changes_requested",
            "approved_at": None,
            "approved_by": None,
            "comments": request.feedback.strip(),
            "good_wishes": None,
            "requested_at": now,
            "requested_by": current_user.id,
        }

        updated = update_handover(
            client,
            handover_id,
            {
                "manager_approval": manager_approval,
                "employee_confirmation": {
                    "status": "pending",
                    "confirmed_at": None,
                    "confirmed_by": None,
                    "comments": None,
                },
                "access_permissions": {
                    "shared": False,
                    "incoming_employee_access": False,
                },
                "shared_at": None,
                "status": "changes_requested",
                "updated_at": now,
            },
        )

        return {
            "message": "Handover returned to the employee for corrections.",
            "handover": updated,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# --------------------------------------------------
# MANAGER SHARES HANDOVER
# --------------------------------------------------

@router.post("/{handover_id}/share")
def share_handover(
    handover_id: str,
    request: ShareRequest,
    authenticated=Depends(get_authenticated_client),
):
    client, current_user = authenticated

    try:
        handover, manager = get_manager_handover(
            client, current_user, handover_id
        )

        approval = handover.get("manager_approval") or {}

        if (
            handover.get("status") not in ("approved", "shared")
            or approval.get("status") != "approved"
        ):
            raise HTTPException(
                status_code=400,
                detail="Approve the handover before sharing it.",
            )

        if not request.permissions.get("viewReport", False):
            raise HTTPException(
                status_code=400,
                detail="Report access must be enabled before sharing.",
            )

        if request.incoming_employee_id == handover.get("outgoing_employee_id"):
            raise HTTPException(
                status_code=400,
                detail="The outgoing employee cannot be the incoming employee.",
            )

        member_response = (
            client.table("project_members")
            .select("user_id, role")
            .eq("project_id", handover["project_id"])
            .eq("user_id", request.incoming_employee_id)
            .execute()
        )

        members = member_response.data or []

        if not members or members[0].get("role") != "employee":
            raise HTTPException(
                status_code=400,
                detail="The selected incoming employee is not an employee assigned to this project.",
            )

        now = datetime.now(timezone.utc).isoformat()

        access_permissions = {
            "shared": True,
            "incoming_employee_access": True,
            "permissions": {
                "viewReport": bool(request.permissions.get("viewReport")),
                "viewDocuments": bool(request.permissions.get("viewDocuments")),
                "viewSources": bool(request.permissions.get("viewSources")),
                "downloadDocuments": bool(request.permissions.get("downloadDocuments")),
            },
            "status": "active",
            "granted_at": now,
            "revoked_at": None,
            "revoked_by": None,
            "shared_by": current_user.id,
        }

        updated = update_handover(
            client,
            handover_id,
            {
                "incoming_employee_id": request.incoming_employee_id,
                "access_permissions": access_permissions,
                "shared_at": now,
                "status": "shared",
                "updated_at": now,
            },
        )

        return {
            "message": "Approved handover shared successfully.",
            "handover": updated,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# --------------------------------------------------
# MANAGER REVOKES INCOMING ACCESS
# --------------------------------------------------

@router.post("/{handover_id}/revoke")
def revoke_handover_access(
    handover_id: str,
    authenticated=Depends(get_authenticated_client),
):
    client, current_user = authenticated

    try:
        handover, manager = get_manager_handover(
            client, current_user, handover_id
        )

        access_permissions = (
            handover.get("access_permissions") or {}
        )

        if not access_permissions.get("incoming_employee_access"):
            raise HTTPException(
                status_code=400,
                detail="There is no active incoming employee access to revoke.",
            )

        now = datetime.now(timezone.utc).isoformat()

        access_permissions.update({
            "shared": False,
            "incoming_employee_access": False,
            "status": "revoked",
            "revoked_at": now,
            "revoked_by": current_user.id,
        })

        updated = update_handover(
            client,
            handover_id,
            {
                "access_permissions": access_permissions,
                "updated_at": now,
            },
        )

        return {
            "message": "Incoming employee access revoked successfully.",
            "handover": updated,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )