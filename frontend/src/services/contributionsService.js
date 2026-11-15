
const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export async function fetchContributions(
  accessToken,
  { period = 'weekly', projectId = '' } = {},
) {
  if (!accessToken) {
    throw new Error('Authentication required. Please log in again.')
  }

  const params = new URLSearchParams({ period })

  if (projectId) {
    params.append('project_id', projectId)
  }

  let response

  try {
    response = await fetch(
      `${API_BASE_URL}/contributions/?${params.toString()}`,
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
      data.detail || 'Unable to fetch contribution analytics.',
    )
  }

  return data
}
