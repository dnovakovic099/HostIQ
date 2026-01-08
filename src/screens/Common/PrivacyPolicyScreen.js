import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRIVACY_POLICY_URL = 'https://dnovakovic099.github.io/hostiq-privacy/';

// Enhanced function to parse HTML and extract structured content
const parseHtml = (html) => {
  if (!html) return [];
  
  // Remove script and style tags and their content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Replace common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&apos;/g, "'");
  text = text.replace(/&mdash;/g, '—');
  text = text.replace(/&ndash;/g, '–');
  text = text.replace(/&hellip;/g, '...');
  
  const elements = [];
  
  // Extract headings (h1-h6)
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
  let headingMatch;
  let lastIndex = 0;
  
  while ((headingMatch = headingRegex.exec(text)) !== null) {
    // Add any text before this heading as paragraph
    const beforeText = text.substring(lastIndex, headingMatch.index);
    const beforeContent = beforeText
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (beforeContent) {
      // Split into paragraphs
      beforeContent.split(/\n\s*\n/).forEach(para => {
        const trimmed = para.trim();
        if (trimmed && trimmed.length > 0) {
          elements.push({ type: 'paragraph', text: trimmed });
        }
      });
    }
    
    // Add the heading
    const headingText = headingMatch[2]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (headingText) {
      const level = parseInt(headingMatch[1]);
      elements.push({ type: 'heading', text: headingText, level });
    }
    
    lastIndex = headingRegex.lastIndex;
  }
  
  // Process remaining content after last heading
  const remainingText = text.substring(lastIndex);
  
  // Extract paragraphs
  const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gi;
  let paraMatch;
  let paraLastIndex = 0;
  
  while ((paraMatch = paragraphRegex.exec(remainingText)) !== null) {
    // Check if there's content between paragraphs
    const betweenText = remainingText.substring(paraLastIndex, paraMatch.index);
    const betweenContent = betweenText
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (betweenContent && !betweenContent.match(/^[\s\n]*$/)) {
      elements.push({ type: 'paragraph', text: betweenContent });
    }
    
    const paraText = paraMatch[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (paraText) {
      elements.push({ type: 'paragraph', text: paraText });
    }
    
    paraLastIndex = paragraphRegex.lastIndex;
  }
  
  // If no structured content found, fall back to simple parsing
  if (elements.length === 0) {
    // Remove all HTML tags but preserve structure
    let cleanText = text
      .replace(/<h[1-6][^>]*>/gi, '\n\n###HEADING###')
      .replace(/<\/h[1-6]>/gi, '###END###\n\n')
      .replace(/<p[^>]*>/gi, '\n\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<\/li>/gi, '')
      .replace(/<ul[^>]*>/gi, '\n')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<ol[^>]*>/gi, '\n')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<strong[^>]*>/gi, '**')
      .replace(/<\/strong>/gi, '**')
      .replace(/<em[^>]*>/gi, '*')
      .replace(/<\/em>/gi, '*')
      .replace(/<[^>]+>/g, ' ');
    
    // Split into paragraphs
    const paragraphs = cleanText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    paragraphs.forEach(para => {
      const trimmed = para.trim();
      if (trimmed.startsWith('###HEADING###')) {
        const headingText = trimmed.replace(/###HEADING###/g, '').replace(/###END###/g, '').trim();
        if (headingText) {
          elements.push({ type: 'heading', text: headingText, level: 2 });
        }
      } else if (trimmed.startsWith('•')) {
        elements.push({ type: 'bullet', text: trimmed });
      } else if (trimmed.length > 0) {
        elements.push({ type: 'paragraph', text: trimmed });
      }
    });
  }
  
  // Filter out redundant headings and metadata
  const filteredElements = [];
  const seenHeadings = new Set();
  const skipHeadingPatterns = [
    /^privacy\s+policy$/i,
    /^hostiq\s*[-–—]\s*privacy\s+policy/i,
    /^privacy\s+policy\s*hostiq$/i,
  ];
  
  const skipParagraphPatterns = [
    /^hostiq\s*[-–—]\s*privacy\s+policy\s*hostiq$/i,
    /^privacy\s+policy\s*hostiq$/i,
    /^hostiq\s*[-–—]\s*privacy\s+policy$/i,
  ];
  
  for (let i = 0; i < elements.length; i++) {
    const item = elements[i];
    
    if (item.type === 'heading') {
      const headingLower = item.text.toLowerCase().trim();
      
      // Skip if it matches common redundant patterns
      const isRedundant = skipHeadingPatterns.some(pattern => pattern.test(headingLower));
      
      // Skip duplicate headings that appear early (first 3 elements)
      const isEarlyDuplicate = i < 3 && seenHeadings.has(headingLower);
      
      if (isRedundant || isEarlyDuplicate) {
        continue;
      }
      
      seenHeadings.add(headingLower);
    }
    
    if (item.type === 'paragraph') {
      const paraLower = item.text.toLowerCase().trim();
      
      // Skip metadata paragraphs that match skip patterns
      const isMetadata = skipParagraphPatterns.some(pattern => pattern.test(paraLower));
      
      // Skip very short paragraphs that are just "HostIQ" or similar at the beginning
      const isShortMetadata = i < 2 && item.text.length < 50 && 
        (item.text.toLowerCase().includes('hostiq') || 
         item.text.toLowerCase().includes('privacy policy'));
      
      if (isMetadata || isShortMetadata) {
        continue;
      }
    }
    
    filteredElements.push(item);
  }
  
  return filteredElements;
};

export default function PrivacyPolicyScreen() {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPrivacyPolicy();
  }, []);

  const fetchPrivacyPolicy = async () => {
    try {
      setLoading(true);
      const response = await fetch(PRIVACY_POLICY_URL);
      const html = await response.text();
      const parsedContent = parseHtml(html);
      setContent(parsedContent);
      setError(null);
    } catch (err) {
      console.error('Error fetching privacy policy:', err);
      setError('Failed to load privacy policy. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
        >
          <Text style={styles.errorText}>{error}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.lastUpdated}>Last Updated: {new Date().toLocaleDateString()}</Text>

        {content.map((item, index) => {
          if (item.type === 'heading') {
            const headingStyle = item.level === 1 
              ? styles.heading1 
              : item.level === 2 
              ? styles.heading2 
              : styles.heading3;
            
            const isFirstHeading = index === 0 || content.slice(0, index).every(el => el.type !== 'heading');
            const containerStyle = isFirstHeading 
              ? [styles.headingContainer, styles.firstHeadingContainer]
              : styles.headingContainer;
            
            return (
              <View key={index} style={containerStyle}>
                <Text style={headingStyle}>{item.text}</Text>
              </View>
            );
          }

          if (item.type === 'bullet') {
            return (
              <View key={index} style={styles.bulletContainer}>
                <Text style={styles.bulletPoint}>{item.text}</Text>
              </View>
            );
          }

          return (
            <View key={index} style={styles.paragraphContainer}>
              <Text style={styles.paragraph}>{item.text}</Text>
            </View>
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using HostIQ, you acknowledge that you have read, understood, and agree to this Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  headingContainer: {
    marginTop: 32,
    marginBottom: 16,
  },
  firstHeadingContainer: {
    marginTop: 8,
  },
  heading1: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  heading2: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  heading3: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  paragraphContainer: {
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
  },
  bulletContainer: {
    marginBottom: 8,
    marginLeft: 8,
  },
  bulletPoint: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
  },
  footer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 20,
  },
});

