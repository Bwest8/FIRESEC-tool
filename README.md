# Fire & Security Drill Reporting System

A modern React-based web application for Pennsylvania schools to manage and report fire and security drill compliance data for PIMS (Pennsylvania Information Management System).

## Overview

This application provides an intuitive interface for school administrators to:
- Track fire and security drills across all school months
- Ensure compliance with Pennsylvania state requirements
- Generate PIMS-compliant CSV exports
- Validate drill data with built-in error checking

## Features

### 🏫 School Management
- Select from comprehensive Pennsylvania district and school database
- Support for all school types (SD, CS, CTC, IU)
- Multi-school district support

### 📅 Drill Tracking
- Monthly drill management (July through June + First Day of School)
- Fire and Security drill types
- Configurable drill limits per month based on state requirements
- Date tracking and validation

### ✅ Compliance Validation
- Real-time validation of drill requirements
- Error highlighting for missing required fields
- Warning system for potential compliance issues
- Security drill timing validation (90-day rule)

### 📊 Export Capabilities
- Generate PIMS-compliant CSV files
- Automatic filename generation with timestamps
- Ready-to-upload format for state reporting

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Data Processing**: PapaParse for CSV generation
- **File Handling**: FileSaver.js

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Bwest8/FIRESEC-tool.git
cd FIRESEC-tool
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

1. **Select School Year**: Choose the appropriate academic year
2. **Choose District**: Select your school district from the dropdown
3. **Enter Drill Data**: For each school and month:
   - Select drill type (Fire or Security)
   - Mark if drill was conducted (Yes/No)
   - Enter date if conducted
   - Provide reason if not conducted
   - Add comments as needed
4. **Validate**: The system automatically validates entries
5. **Export**: Generate CSV file for PIMS submission

## Compliance Rules

### Fire Drills
- Required monthly (except First Day of School)
- Maximum 3 drills per month
- Date required when conducted

### Security Drills
- Maximum 1 drill per month
- Special timing rules apply (90-day validation)
- Date required when conducted

### First Day of School
- Must be marked as conducted
- Date is required
- Only fire drills allowed

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── components/
│   └── DrillForm.tsx      # Main application component
public/
│   └── DistrictLocation.json # Pennsylvania district and school data source
├── App.tsx                # Root component
├── main.tsx              # Application entry point
└── index.css             # Global styles
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Disclaimer

This is an unofficial tool designed to assist with PIMS compliance reporting. Users should verify all data and requirements with official Pennsylvania Department of Education guidelines.