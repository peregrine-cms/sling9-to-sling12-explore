# Development Documentation

This document is documenting and tracking the progress of the Migration Scripts.

The first section contains the documentation of what is already done and working.
The second section contains the next tasks to be done for the conversion.

## Goal

To convert Peregrine CMS to Sling 12 with Feature Models so that we can keep working
on the 'develop' branch and still be able to convert at every step along the way.

## Phase 1

Here we only want to convert the platform modules without nodes (?more?) to **Content
Bundles** and convert the rest FM Content Bundles. The goal is to have a working
Peregrine instance at all times.

## Finished Tasks

* Copy entire **peregrine-cms** over into sub folder **peregrine-cms-sling12**
* Convert **platform/base** to a Content Bundle
    * Find src/main/resources in core
    * Find src/main/content/jcr_root in ui.apps
    * Create SLING-CONTENT in core
    * Copy all content over
    * Go through all folders recursively
        * Convert all .content.xml files to JSon
        * Write them out in a file with the parent folder's name + '.json'
    * Rename .content.xml files but keep them there to make conversion repeatable
    * Add SLING-CONTENT sub folders to bundle creation in POM
    * Remove ui.apps from parent POM file
    * Add the *include-artifact* goal of the Slingfeature Maven Plugin to create the FM file
    * Add the *attach-features* goal of the Slingfeature Maven Plugin to install the FM file
    * Add the base/core FM to the Peregrine FM Build Project
    * Remove base.ui.apps from FM POM
* Convert **platform/felib** to a Content Bundle
* Convert **platform/replication** to a Content Bundle (Content Package w/o jcr_root)
            
## Pending Tasks

* Convert **platform/base** to a Content Bundle
    * Rename ui.apps files but keep them there to make conversion repeatable

* Convert **paagerender/vue** to a Content Bundle
* Convert **admin-base/core** to a Content Bundle
        
## Next Step 