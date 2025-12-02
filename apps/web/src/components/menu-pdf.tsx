import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';

// Styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    textAlign: 'center',
    borderBottom: '2px solid #1a1a1a',
    paddingBottom: 20,
  },
  venueName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  menuName: {
    fontSize: 14,
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
    borderBottom: '1px solid #e5e5e5',
    paddingBottom: 8,
  },
  sectionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionDescription: {
    fontSize: 10,
    color: '#666666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  item: {
    marginBottom: 12,
    paddingBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    paddingRight: 10,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  itemDescription: {
    fontSize: 10,
    color: '#666666',
    marginTop: 2,
    lineHeight: 1.4,
  },
  itemTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  tag: {
    fontSize: 8,
    color: '#ffffff',
    backgroundColor: '#22c55e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  allergenTag: {
    fontSize: 8,
    color: '#92400e',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    borderTop: '1px solid #e5e5e5',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#999999',
  },
});

// Dietary tag labels
const DIETARY_LABELS: Record<string, string> = {
  vegetarian: 'V',
  vegan: 'VG',
  gluten_free: 'GF',
  dairy_free: 'DF',
  nut_free: 'NF',
  halal: 'Halal',
  kosher: 'Kosher',
  spicy: 'Spicy',
  contains_alcohol: '21+',
};

// Allergen labels
const ALLERGEN_LABELS: Record<string, string> = {
  gluten: 'Gluten',
  nuts: 'Nuts',
  peanuts: 'Peanuts',
  milk: 'Dairy',
  eggs: 'Eggs',
  fish: 'Fish',
  shellfish: 'Shellfish',
  soy: 'Soy',
  sesame: 'Sesame',
  crustaceans: 'Crustaceans',
};

interface MenuPDFProps {
  venueName: string;
  menuName: string;
  sections: Array<{
    id: string;
    name: string;
    description?: string | null;
    items: Array<{
      id: string;
      name: string;
      description?: string | null;
      priceAmount?: number | null;
      dietaryTags?: string[] | null;
      allergens?: string[] | null;
    }>;
  }>;
}

// PDF Document Component
function MenuPDFDocument({ venueName, menuName, sections }: MenuPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.venueName}>{venueName}</Text>
          <Text style={styles.menuName}>{menuName}</Text>
        </View>

        {/* Sections */}
        {sections.map((section) => (
          <View key={section.id} style={styles.section} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionName}>{section.name}</Text>
              {section.description && (
                <Text style={styles.sectionDescription}>{section.description}</Text>
              )}
            </View>

            {section.items.map((item) => (
              <View key={item.id} style={styles.item}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.priceAmount !== null && item.priceAmount !== undefined && (
                    <Text style={styles.itemPrice}>
                      ${(item.priceAmount / 100).toFixed(2)}
                    </Text>
                  )}
                </View>
                {item.description && (
                  <Text style={styles.itemDescription}>{item.description}</Text>
                )}
                {((item.dietaryTags && item.dietaryTags.length > 0) ||
                  (item.allergens && item.allergens.length > 0)) && (
                  <View style={styles.itemTags}>
                    {item.dietaryTags?.map((tag) => (
                      <Text key={tag} style={styles.tag}>
                        {DIETARY_LABELS[tag] || tag}
                      </Text>
                    ))}
                    {item.allergens?.map((allergen) => (
                      <Text key={allergen} style={styles.allergenTag}>
                        {ALLERGEN_LABELS[allergen] || allergen}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generated by MenuCraft
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// Function to generate and download PDF
export async function downloadMenuPDF(props: MenuPDFProps & { filename?: string }) {
  const { filename = 'menu', ...documentProps } = props;

  const blob = await pdf(<MenuPDFDocument {...documentProps} />).toBlob();

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export { MenuPDFDocument };
