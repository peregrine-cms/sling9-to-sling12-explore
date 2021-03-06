const SLASH = '/';
const PARENT_FOLDER = '..';
const SLING_CONTENT = 'SLING-CONTENT';
const PEREGRINE_SOURCE_ROOT = PARENT_FOLDER + SLASH + 'peregrine-cms';
const OUTPUT_ROOT = PARENT_FOLDER + SLASH + 'peregrine-cms-sling12';
const FM_PROJECT_FOLDER_PATH = 'sling' + SLASH + 'peregrine-feature-model-starter';
const CONTENT_XML = '.content.xml';
const JCR_ROOT = 'jcr:root';
const UTF8 = 'utf-8';
const JSON_EXT = ".json";
const XMLNS_PREFIX = 'xmlns:';
const CONTENT_OLD_EXT = '.old';
const CONTENT_ORIG_EXT = '.orig';
const CONTENT_XML_OLD = CONTENT_XML + CONTENT_OLD_EXT;
const POM_FILE_NAME = 'pom.xml';
const MAVEN_BUNDLE_PLUGIN = 'maven-bundle-plugin';
const SLING_INITIAL_CONTENT = 'Sling-Initial-Content';
const APACHE_MAVEN_GROUP = 'org.apache.sling';
const SLING_FEATURE_MAVEN_PLUGIN_ARTIFACT = 'slingfeature-maven-plugin';
const SLING_FEATURE_MAVEN_PLUGIN_VERSION = '1.3.4';
const EXECUTION = 'execution';
const SLING_FEATURE_CONVERTER_MAVEN_PLUGIN_ARTIFACT = 'sling-feature-converter-maven-plugin';
const PEREGRINE_CLASSIFIER = 'peregrineCMS'

module.exports = {
    SLASH: SLASH,
    SLING_CONTENT: SLING_CONTENT,
    PEREGRINE_SOURCE_ROOT: PEREGRINE_SOURCE_ROOT,
    OUTPUT_ROOT: OUTPUT_ROOT,
    FM_PROJECT_FOLDER_PATH: FM_PROJECT_FOLDER_PATH,
    CONTENT_XML: CONTENT_XML,
    JCR_ROOT: JCR_ROOT,
    UTF8: UTF8,
    JSON_EXT: JSON_EXT,
    XMLNS_PREFIX: XMLNS_PREFIX,
    CONTENT_OLD_EXT: CONTENT_OLD_EXT,
    CONTENT_XML_OLD: CONTENT_XML_OLD,
    CONTENT_ORIG_EXT: CONTENT_ORIG_EXT,
    POM_FILE_NAME: POM_FILE_NAME,
    MAVEN_BUNDLE_PLUGIN: MAVEN_BUNDLE_PLUGIN,
    SLING_INITIAL_CONTENT: SLING_INITIAL_CONTENT,
    APACHE_MAVEN_GROUP: APACHE_MAVEN_GROUP,
    SLING_FEATURE_MAVEN_PLUGIN_ARTIFACT: SLING_FEATURE_MAVEN_PLUGIN_ARTIFACT,
    SLING_FEATURE_MAVEN_PLUGIN_VERSION: SLING_FEATURE_MAVEN_PLUGIN_VERSION,
    EXECUTION: EXECUTION,
    SLING_FEATURE_CONVERTER_MAVEN_PLUGIN_ARTIFACT: SLING_FEATURE_CONVERTER_MAVEN_PLUGIN_ARTIFACT,
    PEREGRINE_CLASSIFIER: PEREGRINE_CLASSIFIER
}