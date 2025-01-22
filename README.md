# Estimate Pro

A professional-grade estimate generation system designed for modern businesses. Built with Next.js and Tailwind CSS, this application streamlines the process of creating, managing, and exporting detailed estimates.

## Key Features

- **Dynamic Line Items**: Add and remove items with automatic total calculations
- **Smart Pricing**: Automatic markup calculations with customizable rates
- **Professional PDF Export**: Clean, well-formatted PDF estimates that match web display
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Address Management**: Separate billing and shipping address fields
- **Flexible Port Selection**: Automatically finds and uses available ports starting from 8080

## Technical Highlights

- Built with Next.js for optimal performance and SEO
- Styled with Tailwind CSS for modern, responsive design
- Custom server implementation for flexible deployment
- Print-optimized stylesheets for professional PDF output
- Zero-dependency PDF generation using native browser capabilities

## Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher

## Installation

1. Clone the repository:
```bash
git clone https://github.com/kc2vrj/Estimate-Pro.git
cd Estimate-Pro
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The application will start on port 8080 (or the next available port).

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Environment Variables

Create a `.env.local` file in the root directory:

```env
# Add any environment variables here
```

## Project Structure

```
maytech/
├── components/         # React components
├── pages/             # Next.js pages
├── public/            # Static assets
├── styles/            # CSS styles
└── server.js          # Custom server configuration
```

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Commit changes: `git commit -am 'Add some feature'`
3. Push to the branch: `git push origin feature/your-feature-name`
4. Submit a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
