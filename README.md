# Road Ready

A first-person driving-safety game for the November facilities safety meeting, with a live leaderboard kept in a Google Sheet.

| File | What it is |
| --- | --- |
| `index.html` | The game. Players enter a name, drive, and see the leaderboard at the end. |
| `leaderboard.html` | A full-screen top-10 board for the projector. Refreshes every 8 seconds. |
| `Code.gs` | The Google Apps Script that saves scores to the sheet. Kept here for reference; it runs inside Google Sheets, not on GitHub Pages. |

## How scores flow

1. A player types their name and taps **Start driving**. A row is added to the sheet with status **Playing**.
2. When they finish, the same row gets the finish time, points, hazards handled and status **Finished**.
3. Anyone who quits partway stays in the sheet as **Playing** with no score.
4. The leaderboard shows each name's best finished score, highest first. Ties go to whoever finished first.

Scoring: each hazard handled earns 100 points plus up to 50 for keeping speed up. A crash or a missed hazard earns 0. The best possible run is 1,950.

## Setup (about 15 minutes)

### 1. Create the Google Sheet and script

1. Create a new Google Sheet, for example **Road Ready Scores**.
2. Open **Extensions › Apps Script**.
3. Delete the sample code, paste in all of `Code.gs`, and click **Save**.
4. Click **Deploy › New deployment**. Under **Select type** (the gear icon), choose **Web app**.
   - Description: `Road Ready leaderboard`
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy**, then **Authorize access** and approve with your Google account. If you see "Google hasn’t verified this app," click **Advanced › Go to (project name)**. This is your own script.
6. Copy the **Web app URL**. It ends in `/exec`.

The sheet tab named **Scores** is created automatically on the first play.

### 2. Connect the game

Open `index.html` and `leaderboard.html` and paste the URL between the quotes near the top of each file’s script:

```js
const SCRIPT_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
```

### 3. Publish on GitHub Pages

1. The files are already in this repository.
2. After pasting your script URL into `index.html` and `leaderboard.html`, commit the change.
3. Go to **Settings › Pages**, set **Source** to **Deploy from a branch**, pick `main` and `/ (root)`, and save.
4. After a minute or two the game is live at:
   - Game: `https://<your-username>.github.io/road-ready/`
   - Projector board: `https://<your-username>.github.io/road-ready/leaderboard.html`

### 4. Test before the meeting

1. Play one run on your phone using the game link.
2. Check the sheet. You should see a **Playing** row appear when you tap Start, and it should change to **Finished** at the end.
3. Open the projector board and confirm your name shows up.
4. Delete your test rows from the sheet if you want a clean board.

## Changing things later

- **Edited `Code.gs`?** Use **Deploy › Manage deployments**, click the pencil, set **Version** to **New version**, and deploy. This keeps the same URL. Choosing **New deployment** instead creates a new URL, and you’d have to update both HTML files.
- **Reset the leaderboard:** delete the data rows in the **Scores** tab, keeping the header row.
- **Show more than 10 names:** change `TOP_N` in `Code.gs` and redeploy as a new version.

## Notes

- Names are stored as plain text, 24 characters max. The script rejects scores above the maximum possible, but a determined person could still submit a fake score within range. That’s fine for a meeting game. Glance at the sheet if something looks off.
- If the county network blocks `script.google.com` or `github.io`, players can switch to cellular data.
- With `SCRIPT_URL` left empty, the game still works, just without the leaderboard.
