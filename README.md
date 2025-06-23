
# CSV QuickView

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Current Version](https://img.shields.io/badge/version-1.3.0-blue.svg)](https://github.com/your-username/csv-quickview)

The fastest way to view local `.csv` files by turning your Chrome browser into a high-performance data viewer.

---

## The Problem

When you double-click a CSV file, your computer launches a slow, heavy application like Excel or Numbers. For developers, data analysts, and anyone who just needs a "quick look" at tabular data, this process is overkill and breaks your workflow. Your browser is already open and is far more lightweight.

**CSV QuickView** transforms this cumbersome process into a seamless, automatic, one-click viewing experience.

## Core Features

*   **⚡ Instantaneous Loading:** Opens even massive CSV files (100,000+ rows) in a flash thanks to a high-performance virtualized rendering engine.
*   **💻 Seamless OS Integration:** After a one-time setup, Chrome becomes your computer's default CSV viewer. Just double-click any `.csv` file.
*   **📊 Modern, Readable UI:** A clean, spacious table powered by Bulma CSS. Includes automatic **Dark Mode** support for comfortable viewing, day or night.
*   **-↔- Powerful Analysis View:** Both the table header and the **first column** are locked ("sticky"), so you always have context while scrolling through large datasets.
*   **✅ Robust Parsing:** Correctly handles complex CSVs with quoted fields, commas within data, and various line endings.
*   **🔒 Lightweight & Secure:** Built with zero external JavaScript libraries and uses the minimum required permissions to get the job done.

## Installation & Setup

1.  **Install from the Chrome Web Store:** [Coming Soon]
2.  **Grant Permissions:** The first time you open a local CSV, you may be guided to the setup page.
    *   Go to `chrome://extensions`.
    *   Find **CSV QuickView** and turn on the **"Allow access to file URLs"** toggle. This is a required security step that allows the extension to read the files you open.
3.  **Set as Default (Recommended):**
    *   **Windows:** Right-click any `.csv` file > `Properties` > `Opens with:` > Click `Change...` > Select Google Chrome.
    *   **macOS:** Right-click any `.csv` file > `Get Info` > `Open with:` > Select Google Chrome > Click `Change All...`.

Now, simply double-click any CSV file on your computer to open it instantly in the browser.

## For Developers: How to Contribute

We welcome contributions! This guide will help you get the development environment set up.

### Architecture Overview

After several iterations, we arrived at a robust architecture that respects Chrome's security model (Manifest V3).

1.  **Intercept:** The `background.js` service worker uses the `chrome.webNavigation.onBeforeNavigate` API to detect when the user is trying to open a `file://.../*.csv` URL.
2.  **Redirect:** It immediately redirects the tab to a local page within the extension: `viewer.html`. The original `fileUrl` is passed along as a URL query parameter.
3.  **Fetch & Render:** The `viewer.js` script, running on the trusted extension page, then uses the `fetch()` API to read the contents of the `fileUrl`. Because the user has granted file access and the request originates from an extension page with `host_permissions`, this call succeeds.
4.  **Display:** The fetched text is parsed and rendered into the high-performance virtualized table.

This model is secure, reliable, and avoids the race conditions and security errors encountered in earlier architectural attempts.

### Local Setup

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/csv-quickview.git
    ```
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable **"Developer mode"** using the toggle in the top-right corner.
4.  Click the **"Load unpacked"** button.
5.  Select the root directory of the cloned project (`/csv-quickview-extension`).
6.  The extension is now installed locally. Remember to grant it "Allow access to file URLs" permission on the extensions page.

### Project Structure

```
/csv-quickview-extension
|-- /css
|   |-- bulma.min.css         (UI Framework)
|   |-- main.css              (Custom styles, sticky columns, dark mode)
|-- /icons
|   |-- icon16.png
|   |-- icon48.png
|   |-- icon128.png
|-- /js
|   |-- background.js         (Intercepts navigation)
|   |-- help.js               (Powers the setup/help page)
|   |-- viewer.js             (Fetches, parses, and renders the CSV)
|-- help.html                 (First-run setup and popup page)
|-- viewer.html               (The page that hosts the rendered table)
|-- manifest.json             (Core extension configuration)
```

## Roadmap

We have successfully completed the v1.0 MVP! Here's what's planned next:

*   **v1.1:** Column Sorting, Row Filtering (search box).
*   **v1.2:** Add support for remote CSV files (from `https://` URLs). Add a UI to select delimiters (comma, tab, semicolon).
*   **v2.0:** Charting/graphing capabilities, advanced data analysis features.

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE.md) file for details.
```
