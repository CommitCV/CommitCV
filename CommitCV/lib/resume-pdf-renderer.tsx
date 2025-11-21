/**
 * PDF Renderer for Resume using @react-pdf/renderer
 * Generates PDFs with embedded, selectable text
 */

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Resume } from '@/lib/types/Resume'

// Register fonts (optional - uses default Helvetica if not specified)
// Font.register({
//   family: 'Times New Roman',
//   src: '/fonts/TimesNewRoman.ttf'
// })

const styles = StyleSheet.create({
  page: {
    paddingTop: 36, // 0.5 inch
    paddingBottom: 36,
    paddingLeft: 47, // 0.65 inch
    paddingRight: 36,
    fontFamily: 'Times-Roman',
    fontSize: 11,
    lineHeight: 1.15,
  },
  header: {
    textAlign: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 24,
    fontFamily: 'Times-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  contact: {
    fontSize: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  contactText: {
    marginHorizontal: 4,
  },
  section: {
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Times-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    paddingBottom: 2,
    marginBottom: 6,
  },
  subsection: {
    marginBottom: 8,
    marginLeft: 11, // ~0.15 inch
  },
  subsectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  subsectionTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 11,
    flex: 1,
  },
  subsectionDate: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    textAlign: 'right',
    marginLeft: 8,
  },
  subsectionSubtitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  subsectionSubtitleText: {
    fontFamily: 'Times-Italic',
    fontSize: 10,
    flex: 1,
  },
  subsectionLocation: {
    fontFamily: 'Times-Italic',
    fontSize: 10,
    textAlign: 'right',
    marginLeft: 8,
  },
  bulletList: {
    marginLeft: 20,
    marginTop: 4,
    marginBottom: 4,
  },
  bullet: {
    flexDirection: 'row',
    marginBottom: 2,
    fontSize: 10,
  },
  bulletSymbol: {
    width: 12,
    fontSize: 10,
  },
  bulletContent: {
    flex: 1,
    fontSize: 10,
  },
  bulletBold: {
    fontFamily: 'Times-Bold',
  },
  bulletNormal: {
    fontFamily: 'Times-Roman',
  },
  paragraph: {
    marginBottom: 4,
    marginLeft: 11,
    fontSize: 10,
  },
  paragraphBold: {
    fontFamily: 'Times-Bold',
  },
  paragraphNormal: {
    fontFamily: 'Times-Roman',
  },
})

interface ResumePDFDocumentProps {
  resume: Resume
}

export function ResumePDFDocument({ resume }: ResumePDFDocumentProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{resume.header.name}</Text>
          {resume.header.subheaders && resume.header.subheaders.length > 0 && (
            <View style={styles.contact}>
              {resume.header.subheaders.map((item, idx) => (
                <Text key={idx} style={styles.contactText}>
                  {idx > 0 && ' | '}
                  {item.text}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Sections */}
        {resume.sections.map((section, sectionIdx) => (
          <View key={sectionIdx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.name}</Text>

            {/* Subsections */}
            {section.subsections?.map((subsection, subIdx) => (
              <View key={subIdx} style={styles.subsection}>
                {/* Title and Date */}
                {subsection.title && (
                  <View style={styles.subsectionHeader}>
                    <Text style={styles.subsectionTitle}>{subsection.title}</Text>
                    {subsection.date && (
                      <Text style={styles.subsectionDate}>{subsection.date}</Text>
                    )}
                  </View>
                )}

                {/* Subtitle and Location */}
                {(subsection.subtitle || subsection.location) && (
                  <View style={styles.subsectionSubtitle}>
                    {subsection.subtitle && (
                      <Text style={styles.subsectionSubtitleText}>
                        {subsection.subtitle}
                      </Text>
                    )}
                    {subsection.location && (
                      <Text style={styles.subsectionLocation}>
                        {subsection.location}
                      </Text>
                    )}
                  </View>
                )}

                {/* Bullet Points */}
                {subsection.bulletCollection && subsection.bulletCollection.length > 0 && (
                  <View style={styles.bulletList}>
                    {subsection.bulletCollection.map((bullet, bulletIdx) => (
                      <View key={bulletIdx} style={styles.bullet}>
                        <Text style={styles.bulletSymbol}>•</Text>
                        <Text style={styles.bulletContent}>
                          {bullet.bold && (
                            <Text style={styles.bulletBold}>{bullet.bold} </Text>
                          )}
                          {bullet.normal && (
                            <Text style={styles.bulletNormal}>{bullet.normal}</Text>
                          )}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}

            {/* Direct bullet collection (for Awards, etc.) */}
            {section.bulletCollection && section.bulletCollection.length > 0 && (
              <View style={styles.bulletList}>
                {section.bulletCollection.map((bullet, bulletIdx) => (
                  <View key={bulletIdx} style={styles.bullet}>
                    <Text style={styles.bulletSymbol}>•</Text>
                    <Text style={styles.bulletContent}>
                      {bullet.bold && (
                        <Text style={styles.bulletBold}>{bullet.bold} </Text>
                      )}
                      {bullet.normal && (
                        <Text style={styles.bulletNormal}>{bullet.normal}</Text>
                      )}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Paragraph collection (for Skills, Interests) */}
            {section.paragraphCollection && section.paragraphCollection.length > 0 && (
              <View>
                {section.paragraphCollection.map((paragraph, paraIdx) => (
                  <Text key={paraIdx} style={styles.paragraph}>
                    {paragraph.bold && (
                      <Text style={styles.paragraphBold}>{paragraph.bold} </Text>
                    )}
                    {paragraph.normal && (
                      <Text style={styles.paragraphNormal}>{paragraph.normal}</Text>
                    )}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </Page>
    </Document>
  )
}

