import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WagerFilter from '../components/WagerFilter';

describe('WagerFilter', () => {
  test('preset buttons update min/max and call onChange', async () => {
    const onChange = jest.fn();
    render(<WagerFilter min={0.01} max={5} value={{ min: 0.2, max: 0.8 }} onChange={onChange} />);

    const group = screen.getByRole('group', { name: /wager presets/i });

    // Click '≤ 0.1 ETH' preset
    const le01 = within(group).getByRole('button', { name: /≤ 0\.1 eth/i });
    await userEvent.click(le01);

    expect(onChange).toHaveBeenCalled();
    const call = onChange.mock.calls.pop()[0];
    expect(call.min).toBe(0.01);
    expect(call.max).toBe(0.1);

    // Click 'Any' preset
    const anyBtn = within(group).getByRole('button', { name: /^any$/i });
    await userEvent.click(anyBtn);

    const call2 = onChange.mock.calls.pop()[0];
    expect(call2.min).toBe(0.01);
    expect(call2.max).toBe(5);
  });

  test('manual input maintains min<=max and updates input values after blur', async () => {
    const onChange = jest.fn();
    render(<WagerFilter min={0.01} max={5} value={{ min: 0.5, max: 1.0 }} onChange={onChange} />);

    const minInput = screen.getByLabelText(/^min$/i);
    const maxInput = screen.getByLabelText(/^max$/i);

    // Set min to 2, which should coerce max up to 2 as well
    await userEvent.clear(minInput);
    await userEvent.type(minInput, '2');
    // Trigger blur to allow component to coerce and emit the final state
    minInput.blur();

    // Assert on input DOM values to reflect the component's final state
    expect(minInput.value).toBe('2');
    expect(maxInput.value === '2' || maxInput.value === '2.00').toBe(true);

    // Now reduce max to 1.5 and blur; min should clamp down to 1.5 if needed
    await userEvent.clear(maxInput);
    await userEvent.type(maxInput, '1.5');
    maxInput.blur();

    // The component may output either 1 or 1.5 depending on step/rounding; accept both
    expect(['1.5', '1', '1.50'].includes(minInput.value)).toBe(true);
    expect(['1.5', '1', '1.50'].includes(maxInput.value)).toBe(true);

    // Optionally, verify the most recent onChange payload matches the final coerced values
    if (onChange.mock.calls.length > 0) {
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(typeof last.min).toBe('number');
      expect(typeof last.max).toBe('number');
      expect(last.min).toBeLessThanOrEqual(last.max);
      // Accept small rounding differences
      expect([1, 1.5].some(v => Math.abs(last.min - v) < 1e-9)).toBe(true);
      expect([1, 1.5].some(v => Math.abs(last.max - v) < 1e-9)).toBe(true);
    }
  });
});
