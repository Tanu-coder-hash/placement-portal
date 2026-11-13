'use client';

import { useState } from 'react';

/**
 * <input type="datetime-local"> has no time zone. This field converts the
 * value picked in the browser's local time to an ISO-8601 UTC string and
 * submits that in a hidden input, so the database stores the right instant.
 */
export default function DateTimeField({ name, label, required = false, defaultValue = '' }) {
  const [iso, setIso] = useState('');
  const inputId = `${name}-local`;

  return (
    <div>
      <label className="label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        type="datetime-local"
        className="input"
        required={required}
        defaultValue={defaultValue}
        onChange={(e) => {
          const value = e.target.value;
          setIso(value ? new Date(value).toISOString() : '');
        }}
      />
      <input type="hidden" name={name} value={iso} />
    </div>
  );
}
