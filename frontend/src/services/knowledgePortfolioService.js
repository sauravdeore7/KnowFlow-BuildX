
const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export async function fetchKnowledgePortfolio(accessToken) {
  if (!accessToken) {
    throw new Error('Authentication token is missing. Please log in again.')
  }

  let response

  try {
    response = await fetch(
      `${API_BASE_URL}/knowledge-portfolio/`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch {
    throw new Error(
      'Unable to connect to the server. Please check your internet connection or try again.'
    )
  }

  let data

  try {
    data = await response.json()
  } catch {
    throw new Error('Unable to read the server response.')
  }

  if (!response.ok) {
    throw new Error(
      data.detail || 'Unable to load Knowledge Portfolio.'
    )
  }

  return data
}
