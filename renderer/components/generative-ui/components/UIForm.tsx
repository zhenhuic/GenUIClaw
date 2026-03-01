import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { UIFormComponent, UIFormField } from '../../../../shared/types/ui-schema'
import type { UIComponentBaseProps } from '../registry'

type Props = UIComponentBaseProps & { component: UIFormComponent }

export function UIForm({ component, renderBlockId, onAction }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = (data: Record<string, unknown>) => {
    setSubmitted(true)
    onAction(renderBlockId, component.actionId, data)
    setTimeout(() => setSubmitted(false), 2000)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {component.title && (
        <h3
          className="font-semibold"
          style={{ color: 'var(--text)', fontSize: 15, marginBottom: 2 }}
        >
          {component.title}
        </h3>
      )}

      {component.fields.map((field) => (
        <FormField key={field.name} field={field} register={register} error={errors[field.name]} />
      ))}

      <button
        type="submit"
        disabled={submitted}
        className="px-5 py-2.5 rounded-xl text-sm font-medium w-fit transition-all"
        style={{
          background: submitted ? 'var(--green)' : 'var(--accent)',
          color: '#fff',
          boxShadow: '0 1px 3px rgba(124,106,247,0.3)',
          cursor: submitted ? 'default' : 'pointer',
        }}
      >
        {submitted ? 'Submitted' : (component.submitLabel ?? 'Submit')}
      </button>
    </form>
  )
}

function FormField({
  field,
  register,
  error,
}: {
  field: UIFormField
  register: ReturnType<typeof useForm>['register']
  error: unknown
}) {
  const baseInputStyle: React.CSSProperties = {
    background: 'var(--bg)',
    border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
    borderRadius: 10,
    padding: '10px 14px',
    color: 'var(--text)',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }

  const validation = {
    required: field.required ? `${field.label} is required` : false,
    minLength: field.validation?.minLength
      ? { value: field.validation.minLength, message: `Min ${field.validation.minLength} chars` }
      : undefined,
    maxLength: field.validation?.maxLength
      ? { value: field.validation.maxLength, message: `Max ${field.validation.maxLength} chars` }
      : undefined,
    pattern: field.validation?.pattern
      ? { value: new RegExp(field.validation.pattern), message: 'Invalid format' }
      : undefined,
    min: field.validation?.min,
    max: field.validation?.max,
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        {field.label}
        {field.required && <span style={{ color: 'var(--red)' }}> *</span>}
      </label>

      {field.type === 'textarea' ? (
        <textarea
          {...register(field.name, validation)}
          placeholder={field.placeholder}
          rows={4}
          style={{ ...baseInputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          className="selectable ui-input-focus"
        />
      ) : field.type === 'select' ? (
        <select
          {...register(field.name, validation)}
          style={{ ...baseInputStyle, cursor: 'pointer' }}
          className="ui-input-focus"
        >
          <option value="">Select...</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : field.type === 'checkbox' ? (
        <div className="flex items-center gap-2.5 py-1">
          <input
            type="checkbox"
            {...register(field.name)}
            style={{ width: 18, height: 18, accentColor: 'var(--accent)', borderRadius: 4 }}
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {field.placeholder}
          </span>
        </div>
      ) : (
        <input
          type={field.type}
          {...register(field.name, validation)}
          placeholder={field.placeholder}
          style={baseInputStyle}
          className="selectable ui-input-focus"
          defaultValue={field.defaultValue as string}
        />
      )}

      {error && (
        <span className="text-xs" style={{ color: 'var(--red)' }}>
          {(error as { message: string }).message}
        </span>
      )}
    </div>
  )
}
