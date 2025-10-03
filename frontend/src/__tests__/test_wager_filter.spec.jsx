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

  test('manual input maintains min<=max and emits changes', async () => {
    const onChange = jest.fn();
    render(<WagerFilter min={0.01} max={5} value={{ min: 0.5, max: 1.0 }} onChange={onChange} />);

    const minInput = screen.getByLabelText(/^min$/i);
    const maxInput = screen.getByLabelText(/^max$/i);

    await userEvent.clear(minInput);
    await userEvent.type(minInput, '2');
    // When min exceeds max, component aligns max up to min
    const last = onChange.mock.calls.pop()?.[0];
    expect(last.min).toBe(2);
    expect(last.max).toBe(2);

    await userEvent.clear(maxInput);
    await userEvent.type(maxInput, '1.5');
    const last2 = onChange.mock.calls.pop()?.[0];
    expect(last2.min).toBe(1.5);
    expect(last2.max).toBe(1.5);
  });
});
