import Button from "./Button";
import Modal from "./Modal";

function ConfirmModal({
  open,
  title = "Xác nhận thao tác",
  description = "Bạn có chắc chắn muốn tiếp tục?",
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  confirmVariant = "primary",
  loading = false,
  disabled = false,
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
          <Button variant={confirmVariant} loading={loading} disabled={disabled} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-7 text-amber-100">
        Hộp thoại này dùng cho approve, reject, lock, unlock và xác nhận đã nhận tiền.
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </Modal>
  );
}

export default ConfirmModal;
