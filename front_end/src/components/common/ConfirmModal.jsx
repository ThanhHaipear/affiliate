import Button from "./Button";
import Modal from "./Modal";

function ConfirmModal({
  open,
  title = "Xác nh?n thao tác",
  description = "B?n có ch?c ch?n mu?n ti?p t?c?",
  confirmLabel = "Xác nh?n",
  cancelLabel = "H?y",
  confirmVariant = "primary",
  loading = false,
  onClose,
  onConfirm,
  children,
}) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-7 text-amber-100">
        H?p tho?i này dùng cho approve, reject, lock, unlock và xác nh?n dã nh?n ti?n.
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </Modal>
  );
}

export default ConfirmModal;
