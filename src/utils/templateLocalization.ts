/**
 * Centralized template localization utilities
 */

type TranslationFunction = (key: string) => string;

interface LocalizedTemplate {
  displayName: string;
  displayDescription: string | null;
}

/**
 * Get localized template name and description based on template type
 * @param templateName - The original template name from database
 * @param description - The original template description from database
 * @param t - Translation function from useLocalization
 * @returns Localized name and description
 */
export function getLocalizedTemplate(
  templateName: string,
  description: string | null,
  t: TranslationFunction
): LocalizedTemplate {
  // Brazilian Residential Construction (Phase Template)
  if (templateName === 'Brazilian Residential Construction') {
    return {
      displayName: t('phaseTemplates.brazilianTemplate.name'),
      displayDescription: description 
        ? t('phaseTemplates.brazilianTemplate.description')
        : null
    };
  }

  // Brazilian Construction Activities (Activity Template)
  if (templateName === 'Brazilian Construction Activities') {
    return {
      displayName: t('constructionActivities.brazilianTemplate.name'),
      displayDescription: description 
        ? t('constructionActivities.brazilianTemplate.description')
        : null
    };
  }

  // Brazilian Residential WBS (Project WBS Template)
  if (templateName === 'Brazilian Residential WBS') {
    return {
      displayName: t('projectWbsTemplates.templates.brazilianResidential.name'),
      displayDescription: description
        ? t('projectWbsTemplates.templates.brazilianResidential.description')
        : null
    };
  }

  // Brazilian Commercial WBS (Project WBS Template)
  if (templateName === 'Brazilian Commercial WBS') {
    return {
      displayName: t('projectWbsTemplates.templates.brazilianCommercial.name'),
      displayDescription: description
        ? t('projectWbsTemplates.templates.brazilianCommercial.description')
        : null
    };
  }

  // Default: return original values
  return {
    displayName: templateName,
    displayDescription: description
  };
}
