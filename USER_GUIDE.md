# User guide

Yasir Ledger tracks a **cheeti** — a monthly contribution scheme. Every member
contributes a fixed amount each month, the money is collected, and a payout is
disbursed to the members scheduled for that month.

This guide covers the everyday workflow.

---

## Signing in

Open the application and enter the administrator email and password. After five
wrong attempts the form pauses for fifteen minutes.

Your session lasts seven days. The **Sign out** button is in the sidebar on a
computer and in the top bar on a phone.

---

## Choosing a month

The month selector is at the top of the Dashboard and the Collections screen.
The chosen month is part of the page address, so you can bookmark a specific
month, and every screen follows the same choice.

---

## The Dashboard

At a glance, for the selected month:

| Figure | What it means |
|---|---|
| **Expected** | The sum of what every member owes this month. |
| **Collected** | The sum of every valid payment received. |
| **Outstanding** | What is still owed, counting each member's positive balance separately. |
| **Members paid** | Members whose contribution is fully settled. |
| **Collection progress** | Collected as a percentage of expected. |

Below that you will find:

- **Reconciliation** — warnings worth reading. A round that is still short is
  only a note; a payout larger than what was collected is flagged as critical.
- **Next payout** — who is scheduled next and how much is planned against how
  much has actually been disbursed.
- **Recent transactions** — the latest activity across every month.
- **Need a reminder** — everyone who still owes money for this month.

---

## Recording a payment

This is the action you will perform most often, and it is designed to take a
few seconds.

1. Open **Collections**.
2. Choose the month.
3. Find the member — use the search box, or tap **All** members and scroll.
   Members who still owe money are listed first.
4. Tap **Record**.
5. The amount is already filled in with the member's full outstanding balance.
   Change it if they paid something different, or tap **Full** to put the
   balance back.
6. Choose how it was paid: **UPI**, **Bank transfer**, **Cash** or **Other**.
7. The **Received on** field is pre-filled with the current time. Change it if
   the money arrived earlier — for example, a payment made yesterday but
   noticed this morning. The time is always Asia/Kolkata.
8. Add a reference or a note if you want to.
9. Check the **balance after this payment**, then tap **Record payment**.

The screen shows the confirmation once the database has actually stored the
payment — never before.

> **If the phone is offline**, the form refuses to submit and says so plainly.
> Nothing is stored and nothing is queued, so there is no risk of a payment
> silently going missing. Wait for the connection and record it then.

---

## Partial payments

A member can pay in instalments. Record each payment separately — the second
payment adds to the first, and the status changes from **Not paid** to
**Partially paid** to **Paid** as the balance is cleared.

For example, if Fatima owes ₹5,000 and pays ₹2,500:

- her status becomes **Partially paid**
- she still owes ₹2,500

When she pays the remaining ₹2,500, her status becomes **Paid**. Both
transactions stay visible in her history.

---

## Filters and search

On the Collections screen:

| Filter | Shows |
|---|---|
| **All** | Everyone |
| **Pending** | No payment recorded at all |
| **Partially paid** | Some money received, not yet complete |
| **Paid** | Contribution fully settled |
| **Overpaid** | More than the expected amount |
| **Not applicable** | No contribution due from that member this month |

The search box matches on the member's name. Clearing the filters brings
everyone back.

---

## Payment history

Tap a member's name on the Collections screen to expand their history. It
lists every payment: the amount, the date and time, how it was paid, the
reference, and whether the entry has been reversed.

---

## Sending a reminder

1. On the Collections screen, expand the member and tap **Remind**.
2. The message is written for you, using the figures actually recorded:

   > Hi Khaise, for October 2026, your contribution is ₹2,500. We have not
   > recorded this payment yet. Please let me know when you have paid.

3. Edit the wording if you want to.
4. Use **Copy** to copy the message, **WhatsApp** to open it in WhatsApp, or
   **Call** to dial the member.

**WhatsApp** and **Call** only appear when the member has a phone number saved.
Nothing is ever sent automatically — you always send it yourself.

Add or correct a phone number under **Members → Edit**.

---

## Fixing a mistake

If a payment was recorded in error, or with the wrong amount:

1. Open **Transactions**.
2. Find the row and tap the undo button.
3. Confirm.

The original entry stays in the ledger, marked **Reversed**, and a matching
**Reversal** entry is added. Neither counts towards the collection totals, so
the member's balance is corrected immediately — and the history of what
happened is never lost.

To change a member's name, phone number or default contribution, use
**Members → Edit**. Changing the default contribution deliberately does **not**
change any past month's obligation or any payment that has already been
recorded.

---

## Members

The Members screen shows every member with their default monthly contribution,
what they have paid across the whole scheme, what they still owe, and when
they last paid.

**Add member** creates a new member. They start with no obligations in past
months, so adding someone today never changes what the scheme looked like
before today. Give them an obligation in the current month from the
Collections screen.

**Inactive** marks someone who has left the scheme. Their history is kept.

---

## Timeline

The Timeline screen shows all ten rounds, from October 2026 to July 2027. Each
card shows who is scheduled to receive money that month, how much is planned,
how much has actually been disbursed, and what the round collected.

From here you can:

- **add a recipient** to a month;
- **remove a recipient** who is no longer receiving;
- **edit** a payout to change the planned amount, or to record the amount that
  was actually paid, the date it was paid and a reference.

The planned amount and the amount actually disbursed are stored separately and
are never derived from one another. The planned amounts are starting values —
check them against your own arrangement and adjust them.

---

## Transactions

The Transactions screen is the complete ledger.

Filters: **month**, **member**, **payment method**, **date range**, and
**status** — either every entry including reversed ones, or only the valid
transactions that count towards the collection.

**Export CSV** downloads the filtered rows as a spreadsheet, for your own
records or for a group summary.

---

## Settings

The Settings screen shows the scheme's configuration — the period, the number
of rounds and members, the monthly target and the expected total across the
whole scheme — and lets you set each month's status and target.

Closing a month is how you record that a round is finished. A round that is
closed and short of its expected amount is flagged as critical on the
Dashboard, rather than as a note.

> The **target** is a reference figure. The expected collection for a month is
> always the sum of the obligations configured for that month, so the two can
> legitimately differ.

---

## A good routine

- Record each payment **as it arrives**, rather than in a batch at the end of
  the month.
- Check the **Dashboard** at the start of each month to see who is still
  outstanding.
- Send reminders early in the month, not at the end.
- Take a **backup** at the end of each round — see [BACKUP.md](./BACKUP.md).
- Reconcile before each payout: the Dashboard's reconciliation panel tells you
  whether the round collected what it should have.

---

Yasir Ledger · Cheeti contribution scheme · Managed by Yasir
