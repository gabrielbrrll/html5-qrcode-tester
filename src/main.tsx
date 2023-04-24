import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const MemoizedApp = React.memo(App);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <MemoizedApp />
)
