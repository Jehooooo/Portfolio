export async function POST() {
  try {
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:5000'
    const pyRes = await fetch(`${pythonBackendUrl}/api/process-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!pyRes.ok) {
      return Response.json(
        { error: 'Python backend process-data failed' },
        { status: pyRes.status },
      )
    }

    const data = await pyRes.json()
    return Response.json(data)
  } catch (error) {
    return Response.json(
      { error: `Failed to trigger data processing: ${error}` },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:5000'
    const pyRes = await fetch(`${pythonBackendUrl}/api/knowledge`, {
      headers: { 'Content-Type': 'application/json' },
    })

    if (!pyRes.ok) {
      return Response.json(
        { error: 'Python backend knowledge list failed' },
        { status: pyRes.status },
      )
    }

    const data = await pyRes.json()
    return Response.json(data)
  } catch (error) {
    return Response.json(
      { error: `Failed to fetch knowledge list: ${error}` },
      { status: 500 },
    )
  }
}
