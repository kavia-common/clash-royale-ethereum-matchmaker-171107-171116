import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LinkAccountModal from '../components/LinkAccountModal';

describe('LinkAccountModal', () => {
  test('validates player tag mode and calls onSubmit with normalized tag', async () => {
    const onSubmit = jest.fn().mockResolvedValue({});
    const onClose = jest.fn();

    render(<LinkAccountModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    // Modal visible, default mode is tag
    expect(screen.getByRole('dialog', { name: /link clash royale account/i })).toBeInTheDocument();

    const input = screen.getByLabelText(/player tag/i);
    await userEvent.click(input);
    await userEvent.type(input, '#abc12'); // too short
    // Blur to mark as touched
    input.blur();

    // Try to submit (button disabled due to validation)
    const submitBtn = screen.getByRole('button', { name: /link account/i });
    expect(submitBtn).toHaveAttribute('aria-disabled', 'true');

    // Fix to a valid example
    await userEvent.clear(input);
    await userEvent.type(input, '#ABCPYQ9'); // valid charset and length >= 6

    // mark as touched again
    input.blur();

    // Now submit enabled
    expect(submitBtn).toHaveAttribute('aria-disabled', 'false');
    await userEvent.click(submitBtn);

    // onSubmit receives normalized tag and mode
    expect(onSubmit).toHaveBeenCalled();
    const call = onSubmit.mock.calls[0][0];
    expect(call).toMatchObject({ tag: '#ABCPYQ9', mode: 'tag' });
  });

  test('switches to API token mode, validates, and closes on success', async () => {
    const onSubmit = jest.fn().mockResolvedValue({});
    const onClose = jest.fn();

    render(<LinkAccountModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    const tablist = screen.getByRole('tablist', { name: /input mode/i });
    const tokenTab = within(tablist).getByRole('tab', { name: /by api token/i });

    await userEvent.click(tokenTab);

    const tokenInput = screen.getByLabelText(/api token/i);

    // too short
    await userEvent.type(tokenInput, 'short');
    tokenInput.blur();
    const submitBtn = screen.getByRole('button', { name: /link account/i });
    expect(submitBtn).toHaveAttribute('aria-disabled', 'true');

    // Now enter a valid one
    await userEvent.clear(tokenInput);
    await userEvent.type(tokenInput, 'this_is_a_valid_token_12345');
    tokenInput.blur();

    expect(submitBtn).toHaveAttribute('aria-disabled', 'false');
    await userEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalled();
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({ token: 'this_is_a_valid_token_12345', mode: 'token' });

    // onClose should be called after success
    // Allow microtask
    await Promise.resolve();
    expect(onClose).toHaveBeenCalled();
  });
});
