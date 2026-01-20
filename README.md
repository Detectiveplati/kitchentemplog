# Kitchen Temperature & Timing Log System

A professional-grade tablet application for tracking cooking activities across multiple kitchen departments. Built with vanilla JavaScript for Android tablets, featuring real-time timers, temperature monitoring, and CSV-based data persistence.

## Overview

This system is designed to streamline kitchen operations by providing department-specific cooking logs with automatic data persistence. Each department maintains separate records while sharing a unified codebase, enabling efficient meal preparation tracking and quality control.

## Features

### Core Functionality
- **Multi-Department Support**: Separate interfaces for Deep Fry, Combi Oven, and Braising departments
- **Real-Time Timers**: Individual countdown timers for each cooking task
- **Staff Tracking**: Associate each cook with a specific chef for accountability
- **Temperature Logging**: Record core temperature readings for cooked items
- **Tray Counting**: Track the number of trays prepared
- **Recent Activity Display**: Quick view of the last 8 completed cooks
- **CSV Export**: Full data export for analysis and archiving

### Technical Highlights
- **Bilingual Interface**: Full Chinese (Simplified) and English support throughout the UI
- **Persistent File Handles**: Automatic remembering of CSV file location via IndexedDB
- **Tablet Optimized**: Responsive layout engineered for 658x858 Android tablets
- **Offline Capable**: Works without internet connection using File System Access API
- **Extensible Architecture**: Clean data abstraction layer for future database migration

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Storage**: CSV files with IndexedDB handle persistence
- **APIs**: File System Access API, IndexedDB
- **Target Platform**: Android tablets (658x858 minimum resolution)

## Architecture

The application follows a 3-layer architecture:

```
┌─────────────────────────┐
│   UI Layer (app.js)     │
│   - Timer management    │
│   - Staff selection     │
│   - Cooking workflow    │
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│  Data Layer (data.js)   │
│   - CSV operations      │
│   - File persistence    │
│   - Data abstraction    │
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│   CSV Files             │
│   - deepfry.csv         │
│   - combioven.csv       │
│   - braising.csv        │
└─────────────────────────┘
```

This abstraction enables seamless migration to MongoDB or other databases without modifying the UI layer.

## File Structure

```
Kitchen Temp Log/
├── index.html                 # Home page with department links
├── app.js                     # Core cooking logic & UI management
├── data.js                    # Data persistence layer
├── styles.css                 # Unified styling (tablet optimized)
├── README.md                  # This file
│
├── departments/
│   ├── deepfry.html          # Deep Fry department interface
│   ├── combioven.html        # Combi Oven/Grilling interface
│   └── braising.html         # Braising department interface
│
└── (Generated at runtime)
    ├── deepfry.csv           # Deep Fry cooking logs
    ├── combioven.csv         # Combi Oven cooking logs
    └── braising.csv          # Braising cooking logs
```

## Department Configuration

### Deep Fry Department
- **Staff**: Alice, Bob, Charlie (auto-selected: Alice)
- **Menu Items**: Spring Roll, Chicken, Fish
- **Data File**: `deepfry.csv`

### Combi Oven Department
- **Staff**: Ah Dong (specialized griller)
- **Menu Items**: 17 grilled items including honey wings, pandan chicken, teriyaki chicken, satay, and more
- **Data File**: `combioven.csv`

### Braising Department
- **Staff**: Alice, Bob, Charlie (auto-selected: Alice)
- **Menu Items**: Beef, Pork, Vegetables
- **Data File**: `braising.csv`

## Getting Started

### Prerequisites
- Chrome/Chromium-based browser (supports File System Access API)
- Android tablet (minimum 658×858 resolution recommended)
- Access to local file system for CSV storage

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Detectiveplati/kitchentemplog.git
   cd kitchentemplog
   ```

2. **Open in browser**
   - Use a local server to avoid CORS issues:
     ```bash
     python -m http.server 8000
     # or
     npx http-server
     ```
   - Navigate to `http://localhost:8000`

3. **Select a department**
   - Click on the desired department emoji on the home page
   - Select the staff member (auto-selected by default)
   - Begin logging cooks

### First-Time Setup

1. When adding the first cook, you'll be prompted to select or create a CSV file
2. The system remembers your file location for future sessions
3. Subsequent cooks automatically save to the same file

## Usage Workflow

### Adding a New Cook

1. **Select Staff**: Click on a chef's name at the top (auto-selected)
2. **Select Food**: Click on a food item from the menu
3. **Start Timer**: Press "START COOKING" when the item enters the cooking area
4. **Monitor**: Watch the real-time timer on the cook card
5. **End Cooking**: Press "END COOKING" when done
6. **Log Details**: Enter core temperature and number of trays
7. **Save**: Click "SAVE" to record in CSV
8. **View History**: Recently completed cooks appear in the "Recent Cooks" section

### Removing a Cook

- Click "Cancel / Remove" to discard a cook entry
- Available before cooking starts or after cooking ends
- Hidden while cooking is in progress

### Export Data

- Click "Export Full CSV" at the bottom to download all records
- Data includes timestamps, staff names, temperatures, and tray counts

## CSV Format

Each cook record includes:

| Field | Example | Purpose |
|-------|---------|---------|
| Food | Spring Roll | Item being cooked |
| Start Date | 2026-01-20 | Date cooking began |
| Start Time | 14:30:45 | Time cooking began |
| End Date | 2026-01-20 | Date cooking ended |
| End Time | 14:35:22 | Time cooking ended |
| Duration | 4.6 | Minutes cooked |
| Temp | 75.5 | Core temperature (°C) |
| Staff | Alice | Chef responsible |
| Trays | 3 | Number of trays |

## Customization

### Adding a New Menu Item

Edit the relevant department HTML file and add to the food grid:

```html
<button class="food-btn" onclick="addNewCook('新食物 New Food')">
  新食物 New Food
</button>
```

### Adding a New Staff Member

Edit the department HTML and add a staff button:

```html
<button id="staff-NewChef" class="staff-btn" onclick="setGlobalStaff('New Chef')">
  New Chef
</button>
```

### Modifying Tablet Layout

Adjust in `styles.css`:
- **Grid sizing**: `minmax(180px, 1fr)` controls items per row
- **Font sizes**: Adjust `rem` values for different screen sizes
- **Spacing**: Modify `gap` and `padding` values

## Browser Compatibility

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| File System Access API | ✅ | ✅ | ❌ | ❌ |
| IndexedDB | ✅ | ✅ | ✅ | ✅ |
| Recommended | ✅ | ✅ | ❌ | ❌ |

**Note**: Chrome and Edge-based browsers are required for File System Access API functionality.

## Known Limitations

- File System Access API not available in Firefox/Safari (requires alternative storage solution)
- Tablet optimization targets 658×858 minimum; smaller screens may require scrolling
- Single user per session (no concurrent multi-user support)

## Future Enhancements

- **MongoDB Integration**: Replace CSV with cloud database backend
- **Multi-User Support**: Concurrent user sessions with conflict resolution
- **Analytics Dashboard**: Charts and insights on cooking times and temperatures
- **Mobile App**: Native iOS/Android applications
- **Real-Time Sync**: Cloud synchronization across multiple tablets
- **QR Code Integration**: Quick food item selection via QR codes
- **Temperature Alerts**: Notifications when temperatures deviate from targets
- **Staff Performance**: Metrics and trends for each chef

## Development Notes

### Code Standards

- **UI Layer** (`app.js`): Manages state and DOM interactions
- **Data Layer** (`data.js`): Handles all persistence operations
- **Styling** (`styles.css`): Unified tablet-optimized styles
- **Bilingual**: All user-facing text includes Chinese/English

### Making API Changes

The data layer abstraction allows for easy backend swaps. To migrate to a different database:

1. Modify functions in `data.js`:
   - `getOrCreateCSVFile()` → API authentication
   - `saveCookData()` → POST request
   - `loadRecentCookData()` → GET request
   - `exportFullCSVData()` → Generate export

2. No changes needed in `app.js` - all calls remain compatible

### Testing

- Test on actual tablet devices for accurate UI validation
- Verify CSV format with manual file inspection
- Check bilingual text in all user interfaces
- Validate file persistence across sessions

## License

Pending

## Support & Contribution

For issues, suggestions, or contributions:

1. Open an issue on GitHub
2. Describe the problem with steps to reproduce
3. Include device/browser information
4. Provide CSV sample if data-related

## Author

Kitchen Temperature & Timing Log System
- Repository: [Detectiveplati/kitchentemplog](https://github.com/Detectiveplati/kitchentemplog)
- Maintained by: Zack

---

**Last Updated**: January 2026  
**Current Version**: 1.0  
**Status**: In Progress
