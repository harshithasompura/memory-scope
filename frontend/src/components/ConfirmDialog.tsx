import type { ReactNode } from 'react'
import { Button } from './Button'

interface ConfirmDialogProps {
  title: string
  children: ReactNode
  onCancel: () => void
  onConfirm: () => void
  confirmLabel?: string
  confirmLoading?: boolean
}

export function ConfirmDialog({
  title,
  children,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm',
  confirmLoading = false,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-xl border border-[#EAEAEA] bg-white p-5"
      >
        <h2 id="confirm-dialog-title" className="mb-3 font-mono text-sm font-semibold text-gray-900">
          {title}
        </h2>
        <div className="mb-4">{children}</div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={confirmLoading}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} loading={confirmLoading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
