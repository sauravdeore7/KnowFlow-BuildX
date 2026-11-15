
const API_BASE_URL =
  (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')

async function handoverRequest(accessToken, path, body) {
  if (!accessToken) {
    throw new Error('Authentication token is missing. Please log in again.')
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body || {}),
    })
  } catch {
    throw new Error(
      'Unable to connect to KnowFlow server. Please check whether the backend is running.',
    )
  }

  let data

  try {
    data = await response.json()
  } catch {
    throw new Error(
      'The server returned an invalid response. Please try again.',
    )
  }

  if (!response.ok) {
    throw new Error(
      data.detail || 'Handover operation failed. Please try again.',
    )
  }

  return data
}

// --------------------------------------------------
// CREATE HANDOVER - EMPLOYEE
// --------------------------------------------------

export async function createHandover(
  accessToken,
  projectId,
  comments = '',
) {
  if (!projectId) {
    throw new Error('Please select a project.')
  }

  return handoverRequest(accessToken, '/handovers/create', {
    project_id: projectId,
    comments: comments.trim(),
  })
}

// --------------------------------------------------
// EMPLOYEE CONFIRMATION
// --------------------------------------------------

export async function confirmHandover(
  accessToken,
  handoverId,
  comments = '',
) {
  if (!handoverId) {
    throw new Error('Handover record not found. Please refresh the page.')
  }

  return handoverRequest(
    accessToken,
    `/handovers/${encodeURIComponent(handoverId)}/confirm`,
    { comments },
  )
}

// --------------------------------------------------
// MANAGER APPROVAL
// --------------------------------------------------

export async function approveHandover(
  accessToken,
  handoverId,
  goodWishes,
) {
  if (!handoverId) {
    throw new Error('Handover record not found.')
  }

  return handoverRequest(
    accessToken,
    `/handovers/${encodeURIComponent(handoverId)}/approve`,
    { good_wishes: goodWishes },
  )
}

// --------------------------------------------------
// MANAGER REQUESTS CHANGES
// --------------------------------------------------

export async function requestHandoverChanges(
  accessToken,
  handoverId,
  feedback,
) {
  if (!handoverId) {
    throw new Error('Handover record not found.')
  }

  return handoverRequest(
    accessToken,
    `/handovers/${encodeURIComponent(handoverId)}/request-changes`,
    { feedback },
  )
}

// --------------------------------------------------
// MANAGER SHARES HANDOVER
// --------------------------------------------------

export async function shareHandover(
  accessToken,
  handoverId,
  incomingEmployeeId,
  permissions,
) {
  if (!handoverId) {
    throw new Error('Handover record not found.')
  }

  return handoverRequest(
    accessToken,
    `/handovers/${encodeURIComponent(handoverId)}/share`,
    {
      incoming_employee_id: incomingEmployeeId,
      permissions,
    },
  )
}

// --------------------------------------------------
// MANAGER REVOKES INCOMING ACCESS
// --------------------------------------------------

export async function revokeHandoverAccess(
  accessToken,
  handoverId,
) {
  if (!handoverId) {
    throw new Error('Handover record not found.')
  }

  return handoverRequest(
    accessToken,
    `/handovers/${encodeURIComponent(handoverId)}/revoke`,
    {},
  )
}
