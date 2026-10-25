type PasswordRequirementsProps = {
  password: string;
};

export default function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const value = password.trim();
  const requirements = [
    { label: '8+ characters', valid: value.length >= 8 },
    { label: '1 uppercase letter and 1 number', valid: /[A-Z]/.test(value) && /\d/.test(value) },
    { label: '1 special character', valid: /[^A-Za-z0-9]/.test(value) },
  ];

  return (
    <div className="mb-2 w-full rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs">
      {requirements.map(({ label, valid }) => (
        <p key={label} className={valid ? 'text-emerald-700' : 'text-gray-500'}>
          <span className="mr-1" aria-hidden="true">{valid ? '✓' : '○'}</span>{label}
        </p>
      ))}
    </div>
  );
}
