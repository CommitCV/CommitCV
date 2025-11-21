'use client'

import { useEffect, useState, useRef } from 'react'
import { ResumeJsonRenderer } from '@/lib/resume-json-renderer'
import { ResumeToLatex } from '@/lib/ResumeToLatex'
import { convertLatexToPdf } from '@/pages/api/pdfCV/generate'
import type { Resume } from '@/lib/types/Resume'

export default function Home() {
  const [htmlContent, setHtmlContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [mode, setMode] = useState<'html' | 'latex'>('html')
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('')
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Resume JSON data (from your example)
  const resumeData: Resume = {
    "header": {
      "name": "Alex Reynolds",
      "subheaders": [
        {
          "text": "alex.reynolds@example.com"
        },
        {
          "text": "555-123-4567"
        },
        {
          "text": "github.com/alexreynoldsdev",
          "link": "https://github.com/alexreynoldsdev"
        }
      ]
    },
    "sections": [
      {
        "name": "Education",
        "subsections": [
          {
            "title": "University of Cascadia",
            "date": "Sep. 2022 -- Present",
            "subtitle": "Bachelor of Science in Software Engineering, Minor in Cybersecurity",
            "location": "Seattle, WA",
            "bulletCollection": [
              {
                "bold": "GPA:",
                "normal": "3.95 / 4.0, Member of the Dean's Honour List"
              },
              {
                "bold": "Relevant Courses:",
                "normal": "Systems Programming, Web Development, Network Security"
              }
            ]
          }
        ]
      },
      {
        "name": "Work Experience",
        "subsections": [
          {
            "title": "Software Development Intern",
            "date": "May 2023 -- August 2023",
            "subtitle": "NexusTech Solutions",
            "location": "Portland, OR",
            "bulletCollection": [
              {
                "bold": "Developed",
                "normal": "internal web applications using React and Flask"
              },
              {
                "bold": "Optimized",
                "normal": "SQL queries to improve database efficiency by 30 percent"
              }
            ]
          }
        ]
      },
      {
        "name": "Volunteer Experience",
        "subsections": [
          {
            "title": "Tutor | CodeCamp for Kids",
            "date": "2023",
            "bulletCollection": [
              {
                "bold": "Mentored",
                "normal": "students in Python programming fundamentals"
              },
              {
                "bold": "Designed",
                "normal": "interactive coding exercises to enhance learning engagement"
              }
            ]
          }
        ]
      },
      {
        "name": "Projects",
        "subsections": [
          {
            "title": "EcoTrack: Sustainability Tracker",
            "date": "2024",
            "subtitle": "React, Node.js, PostgreSQL",
            "location": "Seattle, WA",
            "bulletCollection": [
              {
                "bold": "Built",
                "normal": "a web platform for tracking personal carbon footprints and eco-friendly habits"
              },
              {
                "bold": "Integrated",
                "normal": "an API for real-time environmental impact calculations"
              }
            ]
          },
          {
            "title": "HomeServer: Self-Hosted Cloud Storage",
            "date": "2024",
            "location": "Seattle, WA",
            "subtitle": "Docker, Linux, Nextcloud",
            "bulletCollection": [
              {
                "bold": "Configured",
                "normal": "a secure, self-hosted cloud storage solution for personal and family use"
              },
              {
                "bold": "Implemented",
                "normal": "automated backups and remote access via VPN"
              }
            ]
          },
          {
            "title": "AI Chess Bot",
            "date": "Ongoing",
            "subtitle": "Python, TensorFlow, Flask",
            "location": "Online",
            "bulletCollection": [
              {
                "bold": "Developing",
                "normal": "an AI-powered chess opponent with machine learning techniques"
              },
              {
                "bold": "Implemented",
                "normal": "an interactive web interface for gameplay and analysis"
              }
            ]
          }
        ]
      },
      {
        "name": "Awards",
        "bulletCollection": [
          {
            "bold": "Hackathon Winner:",
            "normal": "Best AI Project at CodeSprint 2024"
          },
          {
            "normal": "President's Scholarship for Academic Excellence"
          },
          {
            "normal": "Google Cloud Developer Scholarship Recipient"
          },
          {
            "normal": "National Merit Scholar"
          }
        ]
      },
      {
        "name": "Technical Skills",
        "paragraphCollection": [
          {
            "bold": "Languages:",
            "normal": "Python, JavaScript, C++, SQL, Rust, Java, Bash, HTML/CSS"
          },
          {
            "bold": "Tools and Technologies:",
            "normal": "Git, Docker, Linux, PostgreSQL, Flask, React, Node.js, Kubernetes"
          }
        ]
      },
      {
        "name": "Activities and Interests",
        "paragraphCollection": [
          {
            "bold": "Tech Blogger:",
            "normal": "Run a blog with 10,000+ monthly readers covering open-source projects and cybersecurity"
          },
          {
            "bold": "Home Lab Enthusiast:",
            "normal": "Experiment with self-hosted services, network security, and virtualization"
          }
        ]
      }
    ]
  }

  useEffect(() => {
    const loadResume = async () => {
      try {
        setIsLoading(true)

        // Generate HTML from Resume JSON
        const html = ResumeJsonRenderer.renderToHtml(resumeData)
        setHtmlContent(html)
        console.log('✓ Resume rendered from JSON!')
      } catch (error) {
        console.error('Error rendering resume:', error)
        setHtmlContent(`<div style="color: red; padding: 20px;">
          <h3>Error rendering resume</h3>
          <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>`)
      } finally {
        setIsLoading(false)
      }
    }

    loadResume()
  }, [resumeData])

  useEffect(() => {
    let isCancelled = false;

    const generateLatexPreview = async () => {
      if (mode === 'latex' && !isGeneratingPreview) {
        setIsGeneratingPreview(true)
        try {
          const latexContent = ResumeToLatex(resumeData)
          const blob = await convertLatexToPdf(latexContent)

          if (isCancelled) return;

          // Clean up old URL if it exists
          if (pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl)
          }

          const url = URL.createObjectURL(blob)
          setPdfPreviewUrl(url)
          console.log('✓ LaTeX PDF preview generated!')
        } catch (error) {
          if (isCancelled) return;

          console.error('Error generating LaTeX preview:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          alert(`Failed to generate LaTeX preview: ${errorMessage}\n\nMake sure the PDF service is running (docker-compose up pdfcv)`);
          setMode('html') // Fall back to HTML preview
        } finally {
          if (!isCancelled) {
            setIsGeneratingPreview(false)
          }
        }
      } else if (mode === 'html') {
        // Clean up PDF preview URL when switching to HTML
        if (pdfPreviewUrl) {
          URL.revokeObjectURL(pdfPreviewUrl)
          setPdfPreviewUrl('')
        }
      }
    }

    if (!isLoading) {
      generateLatexPreview()
    }

    // Cleanup function
    return () => {
      isCancelled = true;
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl)
      }
    }
  }, [mode, isLoading])

  const generatePDF = async () => {
    if (mode === 'html') {
      // HTML to PDF method - using html2pdf with optimized settings
      try {
        const html2pdf = (await import('html2pdf.js')).default

        // Get or create the element to convert
        let element = contentRef.current

        if (!element) {
          // Create a temporary element if ref is not available
          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = htmlContent
          tempDiv.className = 'latex-content'
          tempDiv.style.cssText = 'background: white; padding: 48px; width: 816px; margin: 0 auto;'
          document.body.appendChild(tempDiv)
          element = tempDiv

          // Clean up after PDF generation
          setTimeout(() => document.body.removeChild(tempDiv), 100)
        }

        const opt = {
          margin: [12.7, 12.7, 12.7, 16.51], // 0.5in margins in mm
          filename: 'resume.pdf',
          image: {
            type: 'jpeg',
            quality: 0.98
          },
          html2canvas: {
            scale: 4, // Very high scale for sharp text
            useCORS: true,
            letterRendering: true,
            logging: false,
            width: 816, // Letter width in pixels at 96 DPI
            windowWidth: 816,
            backgroundColor: '#ffffff',
            onclone: (clonedDoc: Document) => {
              // Ensure styles are properly applied in the clone
              const clonedElement = clonedDoc.querySelector('.latex-content')
              if (clonedElement instanceof HTMLElement) {
                clonedElement.style.fontFamily = 'Georgia, "Times New Roman", Times, serif'
                clonedElement.style.fontSize = '11pt'
                clonedElement.style.lineHeight = '1.15'
                clonedElement.style.color = '#000000'
                // @ts-expect-error - webkitFontSmoothing is not in standard types
                clonedElement.style.webkitFontSmoothing = 'antialiased'
              }
            }
          },
          jsPDF: {
            unit: 'mm',
            format: 'letter',
            orientation: 'portrait',
            compress: false, // Don't compress to maintain quality
            precision: 16
          },
          pagebreak: {
            mode: ['avoid-all', 'css', 'legacy'],
            before: '.resume-section',
            avoid: ['.resume-entry', '.resume-items']
          }
        }

        await html2pdf().set(opt).from(element).save()
        console.log('✓ HTML PDF generated!')
      } catch (error) {
        console.error('Error generating PDF:', error)
        alert('Failed to generate PDF')
      }
    } else {
      // LaTeX API method
      try {
        const latexContent = ResumeToLatex(resumeData)
        const blob = await convertLatexToPdf(latexContent)

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'resume.pdf'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        console.log('✓ LaTeX PDF generated!')
      } catch (error) {
        console.error('Error generating PDF from LaTeX:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert(`Failed to generate PDF from LaTeX: ${errorMessage}\n\nMake sure the PDF service is running (docker-compose up pdfcv)`);
      }
    }
  }

  const generatePDFWithText = async () => {
    try {
      // Dynamic import to avoid SSR issues
      const { pdf } = await import('@react-pdf/renderer')
      const { ResumePDFDocument } = await import('@/lib/resume-pdf-renderer')
      const React = await import('react')

      // Generate PDF with embedded text
      // @ts-expect-error idk just removing error
        const blob = await pdf(React.createElement(ResumePDFDocument, { resume: resumeData })).toBlob()

      // Download the PDF
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'resume-text.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      console.log('✓ PDF with embedded text generated!')
    } catch (error) {
      console.error('Error generating PDF with embedded text:', error)
      alert('Failed to generate PDF with embedded text')
    }
  }

  const downloadLatex = () => {
    try {
      // Generate LaTeX using your ResumeToLatex function
      const latexContent = ResumeToLatex(resumeData)

      // Create blob and download
      const blob = new Blob([latexContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'resume.tex'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      console.log('✓ LaTeX file downloaded!')
    } catch (error) {
      console.error('Error generating LaTeX:', error)
      alert('Failed to generate LaTeX')
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl text-gray-950 font-bold">Resume Preview</h1>
              <p className="text-sm text-gray-600 mt-1">Built from JSON config, exported to LaTeX or PDF</p>
            </div>
            <div className="flex gap-3 items-center">
              <button
                onClick={downloadLatex}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {isLoading ? 'Loading...' : 'LaTeX'}
              </button>
              <button
                onClick={generatePDFWithText}
                disabled={isLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                title="PDF with selectable, embedded text"
              >
                {isLoading ? 'Loading...' : 'PDF (Text)'}
              </button>
              <button
                onClick={generatePDF}
                disabled={isLoading || (mode === 'latex' && isGeneratingPreview)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                title={mode === 'latex' ? 'PDF from LaTeX API' : 'PDF from HTML (image-based)'}
              >
                {isLoading ? 'Loading...' : `PDF (${mode === 'latex' ? 'LaTeX' : 'Image'})`}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-gray-200">
            <span className="text-sm font-medium text-gray-700">Mode:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('html')}
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'html'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:bg-gray-400 disabled:cursor-not-allowed`}
              >
                HTML Mode
              </button>
              <button
                onClick={() => setMode('latex')}
                disabled={isLoading || isGeneratingPreview}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'latex'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:bg-gray-400 disabled:cursor-not-allowed`}
              >
                {isGeneratingPreview ? 'Generating...' : 'LaTeX Mode'}
              </button>
            </div>
            <span className="text-xs text-gray-500 ml-2">
              {mode === 'html' ? '(HTML preview & PDF export)' : '(LaTeX PDF preview & export)'}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600">Rendering your resume...</p>
          </div>
        ) : isGeneratingPreview ? (
          <div className="text-center py-12 bg-white shadow-lg rounded-lg">
            <p className="text-lg text-gray-600">Generating LaTeX PDF preview...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
          </div>
        ) : mode === 'latex' && pdfPreviewUrl ? (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden" style={{ height: '1100px' }}>
            <iframe
              src={pdfPreviewUrl}
              className="w-full h-full"
              title="LaTeX PDF Preview"
            />
          </div>
        ) : (
          <div
            ref={contentRef}
            className="bg-white shadow-lg rounded-lg p-12 latex-content"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        )}

        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h2 className="font-semibold mb-2 text-green-800">✓ Export Options</h2>
          <ul className="text-sm text-gray-950 space-y-1">
            <li>✓ <strong>LaTeX</strong> - Download .tex file for maximum customization</li>
            <li>✓ <strong>PDF (Text)</strong> - Embedded, selectable text (best for ATS)</li>
            <li>✓ <strong>PDF (Image)</strong> - High-quality visual PDF from HTML preview</li>
            <li>✓ <strong>PDF (LaTeX)</strong> - Professional PDF via LaTeX compiler</li>
          </ul>
          <div className="mt-3 pt-3 border-t border-green-200">
            <p className="text-xs text-gray-700">
              <strong>Recommendation:</strong> Use <strong>PDF (Text)</strong> for online applications
              as it has selectable, searchable text that works best with Applicant Tracking Systems (ATS).
              Use <strong>LaTeX</strong> export for advanced customization, or <strong>PDF (LaTeX)</strong>
              for the highest quality professional output.
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-gray-950 mb-2">Data Flow:</h3>
          <div className="text-sm space-y-2 text-gray-700">
            <div className="flex items-center gap-2">
              <code className="bg-white px-2 py-1 rounded">resume.json</code>
              <span>→</span>
              <code className="bg-white px-2 py-1 rounded">ResumeJsonRenderer</code>
              <span>→</span>
              <span className="font-semibold">HTML Preview</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="bg-white px-2 py-1 rounded">resume.json</code>
              <span>→</span>
              <code className="bg-white px-2 py-1 rounded">ResumePDFDocument</code>
              <span>→</span>
              <span className="font-semibold">PDF with Text (ATS-friendly)</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="bg-white px-2 py-1 rounded">resume.json</code>
              <span>→</span>
              <code className="bg-white px-2 py-1 rounded">ResumeToLatex()</code>
              <span>→</span>
              <code className="bg-white px-2 py-1 rounded">API</code>
              <span>→</span>
              <span className="font-semibold">LaTeX PDF Preview</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="bg-white px-2 py-1 rounded">resume.json</code>
              <span>→</span>
              <code className="bg-white px-2 py-1 rounded">ResumeToLatex()</code>
              <span>→</span>
              <span className="font-semibold">LaTeX Export</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="bg-white px-2 py-1 rounded">HTML Preview</code>
              <span>→</span>
              <code className="bg-white px-2 py-1 rounded">html2pdf.js</code>
              <span>→</span>
              <span className="font-semibold">PDF Export (Image-based)</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="bg-white px-2 py-1 rounded">resume.json</code>
              <span>→</span>
              <code className="bg-white px-2 py-1 rounded">ResumeToLatex()</code>
              <span>→</span>
              <code className="bg-white px-2 py-1 rounded">API</code>
              <span>→</span>
              <span className="font-semibold">PDF Export (LaTeX)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

