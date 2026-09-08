import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ExportMenu } from './ExportMenu';

describe('ExportMenu', () => {
  it('is closed by default and opens a menu of export formats on click', async () => {
    const user = userEvent.setup();
    render(<ExportMenu filters={{}} />);

    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /export exceptions/i }));

    expect(screen.getByRole('menuitem', { name: /export as csv/i })).toHaveAttribute(
      'href',
      '/api/reconciliation/exceptions/export?format=csv',
    );
    expect(screen.getByRole('menuitem', { name: /export as excel/i })).toHaveAttribute(
      'href',
      '/api/reconciliation/exceptions/export?format=xlsx',
    );
    expect(screen.getByRole('menuitem', { name: /export as pdf/i })).toHaveAttribute(
      'href',
      '/api/reconciliation/exceptions/export?format=pdf',
    );
  });

  it('includes the current reason, date-range, and sort in every format link', async () => {
    const user = userEvent.setup();
    render(
      <ExportMenu
        filters={{
          reason: 'AMOUNT_MISMATCH',
          from: '2026-07-01',
          to: '2026-07-31',
          sortBy: 'transactionId',
          sortOrder: 'desc',
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /export exceptions/i }));

    const csvHref = screen.getByRole('menuitem', { name: /export as csv/i }).getAttribute('href')!;
    expect(csvHref).toContain('reason=AMOUNT_MISMATCH');
    expect(csvHref).toContain('from=2026-07-01');
    expect(csvHref).toContain('to=2026-07-31');
    expect(csvHref).toContain('sortBy=transactionId');
    expect(csvHref).toContain('sortOrder=desc');
  });

  it('closes the menu on Escape', async () => {
    const user = userEvent.setup();
    render(<ExportMenu filters={{}} />);

    await user.click(screen.getByRole('button', { name: /export exceptions/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
