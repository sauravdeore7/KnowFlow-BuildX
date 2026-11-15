
const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export async function fetchEmployeeReports(
  accessToken,
  {
    projectId = '',
    startDate = '',
    endDate = '',
  } = {},
) {
  if (!accessToken) {
    throw new Error('Your session has expired. Please log in again.')
  }

  const params = new URLSearchParams()

  if (projectId) {
    params.append('project_id', projectId)
  }

  if (startDate) {
    params.append('start_date', startDate)
  }

  if (endDate) {
    params.append('end_date', endDate)
  }

  const query = params.toString()
  const endpoint = `${API_BASE_URL}/reports/employee${query ? `?${query}` : ''}`

  let response

  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
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
    throw new Error('The server returned an invalid response.')
  }

  if (!response.ok) {
    throw new Error(
      data.detail || 'Unable to load your employee reports.',
    )
  }

  return data
}
