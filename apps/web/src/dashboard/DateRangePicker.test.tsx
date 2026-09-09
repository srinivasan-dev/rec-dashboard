import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DateRangePicker } from './DateRangePicker';

describe('DateRangePicker', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-08T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows "All time" when no range is applied', () => {
    render(
      <DateRangePicker
        from={undefined}
        to={undefined}
        onChange={jest.fn()}
        onRefresh={jest.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /all time/i })).toBeInTheDocument();
  });

  it('shows the applied absolute range as a formatted date span', () => {
    render(
      <DateRangePicker
        from="2026-07-01"
        to="2026-07-21"
        onChange={jest.fn()}
        onRefresh={jest.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /jul 1, 2026.*jul 21, 2026/i })).toBeInTheDocument();
  });

  it('resolves a relative preset to concrete dates once applied via the refresh/apply button', async () => {
    const user = userEvent.setup({ delay: null });
    const onChange = jest.fn();
    render(
      <DateRangePicker from={undefined} to={undefined} onChange={onChange} onRefresh={jest.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /all time/i }));
    await user.click(screen.getByRole('button', { name: /last 7 days/i }));

    // Picking a common preset only stages it (DateRangePicker.tsx's `applyCommonPreset` sets
    // pending state and closes the popover, it doesn't call `onChange`) -- the shared refresh
    // icon commits whatever's pending, and its accessible name switches to "Apply selected date
    // range" once there's something to commit.
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /apply selected date range/i }));

    expect(onChange).toHaveBeenCalledWith({ from: '2026-09-01', to: '2026-09-08' });
  });

  it('applies a manually entered absolute range', async () => {
    const user = userEvent.setup({ delay: null });
    const onChange = jest.fn();
    render(
      <DateRangePicker from={undefined} to={undefined} onChange={onChange} onRefresh={jest.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /all time/i }));
    await user.type(screen.getByLabelText(/start date/i), '2026-07-01');
    await user.type(screen.getByLabelText(/end date/i), '2026-07-21');
    // One shared Apply button now serves both Quick select and Absolute range (previously two
    // separately-labeled buttons); its accessible name comes from an `aria-label` of "Apply
    // selected date range" (visible text is just "Apply") -- it only stages the typed range, the
    // refresh/apply icon below is what actually commits it via `onChange`. The two never render
    // at once (this one lives inside the popover, which closes once clicked), so matching both by
    // the same name is unambiguous.
    await user.click(screen.getByRole('button', { name: /apply selected date range/i }));
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /apply selected date range/i }));

    expect(onChange).toHaveBeenCalledWith({ from: '2026-07-01', to: '2026-07-21' });
  });

  it('clears the range', async () => {
    const user = userEvent.setup({ delay: null });
    const onChange = jest.fn();
    render(
      <DateRangePicker
        from="2026-07-01"
        to="2026-07-21"
        onChange={onChange}
        onRefresh={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /jul 1, 2026/i }));
    await user.click(screen.getByRole('button', { name: /clear/i }));
    await user.click(screen.getByRole('button', { name: /apply selected date range/i }));

    expect(onChange).toHaveBeenCalledWith({ from: undefined, to: undefined });
  });

  it('calls onRefresh when the refresh button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const onRefresh = jest.fn();
    render(
      <DateRangePicker
        from={undefined}
        to={undefined}
        onChange={jest.fn()}
        onRefresh={onRefresh}
      />,
    );

    await user.click(screen.getByRole('button', { name: /refresh reconciliation data/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
