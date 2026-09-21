import { Component, type ReactNode } from 'react'

type Props = {
  resetKey: string
  fallback: ReactNode
  children: ReactNode
}

type State = { failed: boolean }

export class FurnitureErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false })
    }
  }

  render() {
    if (this.state.failed) return this.props.fallback
    return this.props.children
  }
}
