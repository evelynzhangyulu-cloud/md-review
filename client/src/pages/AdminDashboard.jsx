import { useState, useEffect, useRef, useCallback } from 'react'
import DiffView from '../components/DiffView'

const API = '/api'

function formatDate(iso) {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminDashboard() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState(null)
  const [diffDoc, setDiffDoc] = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/documents`)
      setDocs(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  // Upload
  const handleUpload = async (files) => {
    if (!files?.length) return
    setUploading(true)
    const form = new FormData()
    for (const f of files) form.append('files', f)
    try {
      const res = await fetch(`${API}/documents/upload`, { method: 'POST', body: form })
      if (res.ok) {
        showToast(`成功上传 ${files.length} 个文档`)
        fetchDocs()
      }
    } catch (e) {
      showToast('上传失败')
    } finally {
      setUploading(false)
    }
  }

  // Copy link
  const copyLink = (token) => {
    const url = `${window.location.origin}/review/${token}`
    navigator.clipboard.writeText(url)
    showToast('评审链接已复制')
  }

  // Download
  const download = (id) => {
    window.open(`${API}/documents/${id}/download`, '_blank')
  }

  // Delete
  const handleDelete = async (id) => {
    if (!confirm('确定删除该文档？')) return
    await fetch(`${API}/documents/${id}`, { method: 'DELETE' })
    showToast('已删除')
    fetchDocs()
  }

  // View diff
  const viewDiff = async (id) => {
    const res = await fetch(`${API}/documents/${id}`)
    const data = await res.json()
    setDiffDoc(data)
  }

  // Drag & drop
  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onDrop = (e) => { e.preventDefault(); setDragging(false); handleUpload(e.dataTransfer.files) }

  return (
    <>
      <div className="page-header">
        <h1>MD文档评审平台</h1>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>管理端</span>
      </div>

      <div className="page-body">
        {/* Upload */}
        <div
          className={`upload-area ${dragging ? 'dragging' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div className="upload-icon">{uploading ? '...' : '+'}</div>
          <p>{uploading ? '上传中...' : '点击或拖拽 .md 文件到此处上传'}</p>
          <input
            ref={fileRef}
            type="file"
            accept=".md"
            multiple
            hidden
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>

        {/* Document list */}
        {loading ? (
          <div className="empty-state">加载中...</div>
        ) : docs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">-</div>
            <p>暂无文档，上传 MD 文件开始评审</p>
          </div>
        ) : (
          <div className="doc-table">
            <table>
              <thead>
                <tr>
                  <th>文档名称</th>
                  <th>状态</th>
                  <th>上传时间</th>
                  <th>最后修改</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.id}>
                    <td style={{ fontWeight: 500 }}>{doc.title}</td>
                    <td>
                      <span className={`badge badge-${doc.status}`}>
                        {doc.status === 'pending' ? '待评审' : '已修改'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{formatDate(doc.createdAt)}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{formatDate(doc.updatedAt)}</td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-primary btn-sm" onClick={() => copyLink(doc.shareToken)}>
                          复制评审链接
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => viewDiff(doc.id)}>
                          查看修改
                        </button>
                        <button className="btn btn-success btn-sm" onClick={() => download(doc.id)}>
                          下载
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(doc.id)}>
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Diff modal */}
      {diffDoc && (
        <div className="modal-overlay" onClick={() => setDiffDoc(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>修改对比 - {diffDoc.title}</h2>
              <button className="btn btn-outline btn-sm" onClick={() => setDiffDoc(null)}>关闭</button>
            </div>
            <div className="modal-body">
              <DiffView original={diffDoc.originalContent} current={diffDoc.currentContent} />
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
