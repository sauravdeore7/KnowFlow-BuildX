
const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export async function extractProjectKnowledge(accessToken, projectId) {
  if (!accessToken) {
    throw new Error(
      'Authentication token is missing. Please log in again.',
    )
  }

  if (!projectId) {
    throw new Error('Please select a project first.')
  }

  let response

  try {
    response = await fetch(
      `${API_BASE_URL}/knowledge/extract/${encodeURIComponent(projectId)}`,
      {
        method: 'POST',
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

  const responseText = await response.text()

  let data = {}

  if (responseText) {
    try {
      data = JSON.parse(responseText)
    } catch {
      throw new Error(
        `The server returned an invalid response (HTTP ${response.status}).`,
      )
    }
  }

  if (!response.ok) {
    throw new Error(
      data.detail ||
        data.message ||
        `Knowledge extraction failed (HTTP ${response.status}).`,
    )
  }

  return data
}
