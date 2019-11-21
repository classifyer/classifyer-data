# How To Contribute

If you have mappings that would extend the existing classification systems in this repository (located in the `mappings` directory) you can add your mappings to the appropriate file by following [contributing to an existing classification system](#contributing-to-an-existing-classification-system) guidelines. For adding mappings to a classification system that doesn't already exist in this repository, please follow [contributing to a new classification system](#contributing-to-a-new-classification-system).

# Contributing To An Existing Classification System

In order to add your mappings to an existing classification system, please follow these steps:
  1. Fork this repository
  2. In your fork, locate the mappings file for the classification system you want to contribute to inside `mappings` directory (e.g. AMCO in Dutch is `amco_nl.csv`), if the classification system is not listed or is listed in other languages, please follow [contributing to a new classification system](#contributing-to-a-new-classification-system)
  3. **Append the new mappings to the file**, not leaving any columns out (write your organization/own name in the `contributor` column)
  4. Commit your changes to your fork and **make a pull request** to this repository for a review

# Contributing To A New Classification System

If you want to add mappings for a new classification system, please follow these steps:
  1. Fork this repository
  2. In your fork, add a Markdown file in the `descriptions` directory and name it according to your classification system's name in lowercase (e.g. AMCO: `amco.md` if in English or `amco_nl.md` if in Dutch)
  3. **Add your mappings** in the `mappings` directory in lowercase following this format: `name_lang.csv` (the language abbreviation should follow the [ISO 639-1 standard](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes))
  4. Make sure you **use UTF-8** for the mappings file's encoding
  5. At minimum, **provide the following columns**:
      | literal | code | standard | contributor |
      |---------|------|----------|-------------|
      | The mapping literal | The classification code | The standard term which the literal is mapped to (defined by the classification) | Your organization/own name |
  6. If any other columns should be included (e.g. Province column in AMCO is included to eliminate ambiguity) include them after the `contributor` column (since this matter is subjective, we'll give you a feedback in the pull request when we review your mappings file)
  7. Finally, commit your changes to your fork and **make a pull request** to this repository for a review

# What Happens After

After you make a contribution, we'll review your work and give you a feedback if any changes are needed. If everything looks fine, we'll accept your pull request and add your signature (the value of your `contributor` field) to our contributors list. Your work will then be integrated into the application's database in a few days and other researchers will be able to reuse your work while seeing your signature next to any mappings contributed by you.
