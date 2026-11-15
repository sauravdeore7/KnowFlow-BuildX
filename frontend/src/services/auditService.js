const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export async function fetchAuditLogs(
  accessToken,
  filters = {},
) {
  if (!accessToken) {
    throw new Error('Authentication token is missing. Please log in again.')
  }

  const params = new URLSearchParams()

  if (filters.projectId) params.set('project_id', filters.projectId)
  if (filters.actionType) params.set('action_type', filters.actionType)
  if (filters.entityType) params.set('entity_type', filters.entityType)
  if (filters.search?.trim()) params.set('search', filters.search.trim())
  if (filters.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters.dateTo) params.set('date_to', filters.dateTo)

  params.set('limit', String(filters.limit || 50))
  params.set('offset', String(filters.offset || 0))

  let response

  try {
    response = await fetch(
      `${API_BASE_URL}/audit-logs/?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
  } catch {
    throw new Error(
      'Unable to connect to KnowFlow server. Please check whether the backend is running.',
    )
  }

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.detail || 'Unable to retrieve audit history. Please try again.',
    )
  }

  return data
}
