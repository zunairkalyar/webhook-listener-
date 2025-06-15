import React, { useState } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode; 
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Correct usage of React.useId: Call once at the top level.
  // This unique ID will be used for linking the trigger and the tooltip content.
  const baseId = React.useId();
  const generatedTooltipId = `tooltip-${baseId}`;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const handleMouseEnter = () => setIsVisible(true);
  const handleMouseLeave = () => setIsVisible(false);
  const handleFocus = () => setIsVisible(true);
  const handleBlur = () => setIsVisible(false);

  const triggerElement = React.isValidElement(children) ? (
    React.cloneElement(children as React.ReactElement<any>, {
      onMouseEnter: (...args: any[]) => {
        handleMouseEnter();
        if ((children as React.ReactElement<any>).props.onMouseEnter) {
          (children as React.ReactElement<any>).props.onMouseEnter(...args);
        }
      },
      onMouseLeave: (...args: any[]) => {
        handleMouseLeave();
        if ((children as React.ReactElement<any>).props.onMouseLeave) {
          (children as React.ReactElement<any>).props.onMouseLeave(...args);
        }
      },
      onFocus: (...args: any[]) => {
        handleFocus();
        if ((children as React.ReactElement<any>).props.onFocus) {
          (children as React.ReactElement<any>).props.onFocus(...args);
        }
      },
      onBlur: (...args: any[]) => {
        handleBlur();
        if ((children as React.ReactElement<any>).props.onBlur) {
          (children as React.ReactElement<any>).props.onBlur(...args);
        }
      },
      // Use the stable, top-level generated ID
      'aria-describedby': isVisible ? generatedTooltipId : undefined,
    })
  ) : (
    <span 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave} 
      onFocus={handleFocus} 
      onBlur={handleBlur}
      tabIndex={0} 
      role="button" 
      // Use the stable, top-level generated ID
      aria-describedby={isVisible ? generatedTooltipId : undefined}
      className="inline-block" 
    >
      {children}
    </span>
  );

  return (
    <div className="relative inline-flex">
      {triggerElement}
      {isVisible && (
        <div
          id={generatedTooltipId} // Use the same stable ID here
          role="tooltip"
          className={`absolute z-10 px-3 py-2 text-sm font-medium text-white bg-slate-700 rounded-lg shadow-sm whitespace-nowrap ${positionClasses[position]}`}
        >
          {text}
        </div>
      )}
    </div>
  );
};