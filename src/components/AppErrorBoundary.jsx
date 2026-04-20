import { Component } from 'react'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Unexpected application error.',
    }
  }

  componentDidCatch(error) {
    // Keep console diagnostics for local debugging.
    console.error('AppErrorBoundary caught runtime error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main style={{ padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ margin: '0 0 12px' }}>Something went wrong</h1>
          <p style={{ margin: '0 0 8px' }}>
            The page crashed during rendering. Reload the page after fixing the error.
          </p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              background: '#f7f7f7',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            {this.state.message}
          </pre>
        </main>
      )
    }

    return this.props.children
  }
}

export default AppErrorBoundary
