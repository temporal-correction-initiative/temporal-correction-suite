# Manual Test Plan: Navigation Robustness

The goal of this test is to determine if the `MutationObserver` currently implemented in `content.js` is sufficient to handle GitHub's internal navigation and browser history events (Back/Forward).

## Instructions
1.  Install the extension in your browser.
2.  Perform each scenario below.
3.  Check if the contribution graph is **Monday-aligned** or if it reverted to **Sunday-start**.
4.  Record your findings in the **Actual Result** column.

| Scenario ID | Test Scenario | Expected Result | Actual Result |
| :--- | :--- | :--- | :--- |
| **TC-01** | **Direct Load:** Paste a profile URL into the address bar and press Enter. | Graph starts on Monday. | |
| **TC-02** | **Internal Link:** Navigate to a profile from the GitHub dashboard or via search. | Graph starts on Monday. | |
| **TC-03** | **Profile-to-Profile:** From User A's profile, click a follower or followee to go to User B's profile. | User B's graph starts on Monday. | |
| **TC-04** | **Browser Back:** From User B's profile, click the browser's **Back** button. | User A's graph starts on Monday. | |
| **TC-05** | **Browser Forward:** From User A's profile (after TC-04), click the **Forward** button. | User B's graph starts on Monday. | |
| **TC-06** | **Tab Switching:** On a profile, click the "Repositories" tab, wait, then click the "Overview" tab. | Graph (which reloads in Overview) starts on Monday. | |
| **TC-07** | **Contribution Filtering:** Click a specific year in the sidebar to load that year's graph. | The new year's graph starts on Monday. | |

## Observations & Findings
*   *Please note any scenarios where the graph flickers (starts Sunday then flips to Monday).*
*   *Note any scenario where it fails completely.*

---
**After completing these tests, we will decide if re-adding a `popstate` listener or polling is necessary.**
