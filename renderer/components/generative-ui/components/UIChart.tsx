import React from 'react'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import type { UIChartComponent } from '../../../../shared/types/ui-schema'
import type { UIComponentBaseProps } from '../registry'

type Props = UIComponentBaseProps & { component: UIChartComponent }

const DEFAULT_COLORS = ['#7c6af7', '#60a5fa', '#4ade80', '#fbbf24', '#f87171', '#a78bfa']

export function UIChart({ component }: Props) {
  const colors = component.colors ?? DEFAULT_COLORS

  return (
    <div className="flex flex-col gap-2">
      {component.title && (
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          {component.title}
        </p>
      )}
      <ResponsiveContainer width="100%" height={240}>
        {renderChart(component, colors)}
      </ResponsiveContainer>
    </div>
  )
}

function renderChart(component: UIChartComponent, colors: string[]): React.ReactElement {
  const commonProps = {
    data: component.data,
    margin: { top: 5, right: 10, left: 0, bottom: 5 },
  }

  const axisStyle = { fontSize: 11, fill: 'var(--text-muted)' }

  switch (component.chartType) {
    case 'bar':
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey={component.xKey} tick={axisStyle} />
          <YAxis tick={axisStyle} />
          <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
          <Legend />
          {component.yKeys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      )

    case 'line':
      return (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey={component.xKey} tick={axisStyle} />
          <YAxis tick={axisStyle} />
          <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
          <Legend />
          {component.yKeys.map((key, i) => (
            <Line key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      )

    case 'area':
      return (
        <AreaChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey={component.xKey} tick={axisStyle} />
          <YAxis tick={axisStyle} />
          <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
          <Legend />
          {component.yKeys.map((key, i) => (
            <Area key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} fill={`${colors[i % colors.length]}30`} strokeWidth={2} />
          ))}
        </AreaChart>
      )

    case 'pie':
      return (
        <PieChart>
          <Pie data={component.data} dataKey={component.yKeys[0]} nameKey={component.xKey} cx="50%" cy="50%" outerRadius={90} label>
            {component.data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
          <Legend />
        </PieChart>
      )

    default:
      return <BarChart {...commonProps}><Bar dataKey={component.yKeys[0]} fill={colors[0]} /></BarChart>
  }
}
