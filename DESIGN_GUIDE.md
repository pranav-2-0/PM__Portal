# Capgemini Design Implementation

## Design System Applied

### Brand Colors
- **Primary Blue**: #12ABDB (Capgemini signature blue)
- **Secondary Blue**: #0070AD (Dark blue)
- **Background**: #F5F7FA (Light gray)
- **Text**: #1A1A1A (Dark gray)

### Typography
- **Font Family**: Roboto, Arial, sans-serif
- **Headings**: Bold, Capgemini blue (#0070AD)
- **Body**: Regular weight, dark gray

### Components

#### Material-UI Integration
- **AppBar**: Gradient background with Capgemini blues
- **Cards**: Elevated with hover effects, rounded corners
- **Buttons**: Gradient background, no text transform
- **Tables**: Clean headers with Capgemini blue
- **Chips**: Color-coded for status indicators

### Responsive Design
- **Grid System**: Material-UI Grid with breakpoints
  - xs: Mobile (< 600px)
  - sm: Tablet (≥ 600px)
  - md: Desktop (≥ 900px)
  - lg: Large Desktop (≥ 1200px)
  - xl: Extra Large (≥ 1536px)

- **Container**: Max-width xl for consistent layout
- **Spacing**: Consistent 8px base unit

### Key Features
1. **Gradient Backgrounds**: Primary buttons and stat cards
2. **Icon Integration**: Material Icons for visual clarity
3. **Status Indicators**: Color-coded chips (success, warning, error)
4. **Hover Effects**: Subtle animations on cards and buttons
5. **Modal Dialogs**: For PM recommendations
6. **Responsive Tables**: Horizontal scroll on mobile

## Installation

```bash
cd frontend
npm install
npm run dev
```

## Dependencies Added
- @mui/material
- @mui/icons-material
- @emotion/react
- @emotion/styled

## File Structure
```
frontend/src/
├── theme/
│   └── capgeminiTheme.ts    # Theme configuration
├── components/
│   └── Navbar.tsx            # Material-UI AppBar
└── pages/
    ├── Dashboard.tsx         # Stat cards + capacity table
    ├── DataUpload.tsx        # Upload cards with icons
    ├── NewJoiners.tsx        # Table + dialog for PM selection
    └── Assignments.tsx       # Status table with chips
```

## Design Principles
1. **Consistency**: Uniform spacing, colors, and typography
2. **Clarity**: Clear visual hierarchy
3. **Accessibility**: Proper contrast ratios
4. **Responsiveness**: Mobile-first approach
5. **Brand Alignment**: Capgemini visual identity
