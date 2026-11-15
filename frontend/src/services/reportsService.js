
const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export async function fetchReports(accessToken) {
  if (!accessToken) {
    throw new Error('Your session has expired. Please log in again.')
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}/reports/`, {
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
      data.detail || 'Unable to load reports and analytics.',
    )
  }

  if (!Array.isArray(data.projects)) {
    throw new Error('Invalid reports data received from the server.')
  }

  return data.projects
}
