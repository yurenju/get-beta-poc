interface ClearButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

/**
 * 清除標記按鈕
 */
export function ClearButton({ onClick, disabled = false }: ClearButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px',
        fontSize: '16px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1
      }}
    >
      🗑️ 清除所有標記
    </button>
  );
}
