import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import MDEditor from '@uiw/react-md-editor'

const API = '/api'

export default function ReviewPage() {
  const { token } = useParams()
  const [doc, setDoc] = useState(null)
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [error, setError] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const fetchDoc = useCallback(async () => {
    try {
      const res = await fetch(`${API}/review/${token}`)
      if (!res.ok) { setError('文档不存在或链接无效'); return }
      const data = await res.json()
      setDoc(data)
      setContent(data.currentContent)
      setSavedContent(data.currentContent)
    } catch (e) {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchDoc() }, [fetchDoc])

  // Save
  const handleSave = async () => {
    if (!doc) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/documents/${doc.id}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, status: 'reviewed' }),
      })
      if (res.ok) {
        setSavedContent(content)
        showToast('保存成功')
      }
    } catch (e) {
      showToast('保存失败')
    } finally {
      setSaving(false)
    }
  }

  // Keyboard shortcut: Ctrl+S
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const hasChanges = content !== savedContent

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--muted)' }}>
        加载中...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--danger)' }}>
        {error}
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <h1 style={{ fontSize: 16 }}>{doc.title}</h1>
        <div className="review-toolbar">
          <span className={`save-hint ${hasChanges ? 'unsaved' : ''}`}>
            {hasChanges ? '有未保存的修改' : '已保存'}
          </span>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? '保存中...' : '保存修改'}
          </button>
        </div>
      </div>

      <div className="review-container" data-color-mode="light">
        <div className="review-editor">
          <MDEditor
            value={content}
            onChange={(val) => setContent(val || '')}
            height="100%"
            preview="live"
            visibleDragbar={false}
          />
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
