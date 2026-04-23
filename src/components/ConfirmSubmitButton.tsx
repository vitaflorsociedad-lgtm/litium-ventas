"use client";

type Props = {
  label: string;
  confirmText: string;
  className?: string;
};

export default function ConfirmSubmitButton({
  label,
  confirmText,
  className = "",
}: Props) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(confirmText)) {
          e.preventDefault();
        }
      }}
      className={className}
    >
      {label}
    </button>
  );
}