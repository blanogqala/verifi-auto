import React from 'react';
export type CardProps = React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType;
  tone?: 'default' | 'accent';
  children?: React.ReactNode;
  [key: string]: unknown;
};
/** One shared visual primitive for all roles. Change styles/cards.css to update every card. */
export function Card({
  as: Tag = 'section',
  tone = 'default',
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <Tag
      {...props}
      className={['ui-card', tone === 'accent' ? 'ui-card--accent' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Tag>
  );
}
