/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'path';
import {getVersionFromSourceFilePath} from '../versions/version';
import type {VersionMetadata} from '@docusaurus/plugin-content-docs';

/**
 * Creates a minimal VersionMetadata stub for testing
 * getVersionFromSourceFilePath, which only inspects contentPath and
 * contentPathLocalized via getContentPathList.
 */
function createVersionMetadataStub(
  overrides: Pick<VersionMetadata, 'versionName' | 'contentPath'> &
    Partial<Pick<VersionMetadata, 'contentPathLocalized'>>,
): VersionMetadata {
  return {
    contentPath: overrides.contentPath,
    contentPathLocalized: overrides.contentPathLocalized,
    versionName: overrides.versionName,
    label: overrides.versionName,
    path: `/${overrides.versionName}`,
    tagsPath: `/${overrides.versionName}/tags`,
    banner: null,
    badge: false,
    noIndex: false,
    className: '',
    isLast: false,
    sidebarFilePath: undefined,
    routePriority: undefined,
  };
}

describe('getVersionFromSourceFilePath', () => {
  const siteDir = path.join('/site');

  describe('with non-overlapping paths', () => {
    // Standard layout: docs/ (current) + community_versioned_docs/version-1.0.0
    const currentVersion = createVersionMetadataStub({
      versionName: 'current',
      contentPath: path.join(siteDir, 'docs'),
    });
    const version100 = createVersionMetadataStub({
      versionName: '1.0.0',
      contentPath: path.join(
        siteDir,
        'community_versioned_docs',
        'version-1.0.0',
      ),
    });
    // current is first, matching real version ordering
    const versionsMetadata = [currentVersion, version100];

    it('classifies a file in current docs as current', () => {
      const filePath = path.join(siteDir, 'docs', 'intro.mdx');
      expect(getVersionFromSourceFilePath(filePath, versionsMetadata)).toBe(
        currentVersion,
      );
    });

    it('classifies a file in versioned docs as the correct version', () => {
      const filePath = path.join(
        siteDir,
        'community_versioned_docs',
        'version-1.0.0',
        'intro.mdx',
      );
      expect(getVersionFromSourceFilePath(filePath, versionsMetadata)).toBe(
        version100,
      );
    });

    it('classifies a file in localized current docs as current', () => {
      const localizedCurrentVersion = createVersionMetadataStub({
        versionName: 'current',
        contentPath: path.join(siteDir, 'docs'),
        contentPathLocalized: path.join(
          siteDir,
          'i18n',
          'fr',
          'docusaurus-plugin-content-docs',
          'current',
        ),
      });
      const localizedVersion100 = createVersionMetadataStub({
        versionName: '1.0.0',
        contentPath: path.join(
          siteDir,
          'community_versioned_docs',
          'version-1.0.0',
        ),
        contentPathLocalized: path.join(
          siteDir,
          'i18n',
          'fr',
          'docusaurus-plugin-content-docs',
          'version-1.0.0',
        ),
      });
      const localizedVersionsMetadata = [
        localizedCurrentVersion,
        localizedVersion100,
      ];

      const filePath = path.join(
        siteDir,
        'i18n',
        'fr',
        'docusaurus-plugin-content-docs',
        'current',
        'intro.mdx',
      );
      expect(
        getVersionFromSourceFilePath(filePath, localizedVersionsMetadata),
      ).toBe(localizedCurrentVersion);
    });
  });

  describe('with overlapping path prefixes (edge case)', () => {
    // Layout that triggers the bug: docs-selfhost (current) has the same
    // string prefix as docs-selfhost_versioned_docs/version-1.0.0 (versioned)
    const currentVersion = createVersionMetadataStub({
      versionName: 'current',
      contentPath: path.join(siteDir, 'docs-selfhost'),
    });
    const version100 = createVersionMetadataStub({
      versionName: '1.0.0',
      contentPath: path.join(
        siteDir,
        'docs-selfhost_versioned_docs',
        'version-1.0.0',
      ),
    });
    // current is first, matching real version ordering
    const versionsMetadata = [currentVersion, version100];

    it('classifies a file in current docs as current', () => {
      const filePath = path.join(siteDir, 'docs-selfhost', 'intro.mdx');
      expect(getVersionFromSourceFilePath(filePath, versionsMetadata)).toBe(
        currentVersion,
      );
    });

    it('classifies a versioned file as the correct version, not current', () => {
      const filePath = path.join(
        siteDir,
        'docs-selfhost_versioned_docs',
        'version-1.0.0',
        'guides',
        'admin',
        'deploy',
        'index.mdx',
      );
      expect(getVersionFromSourceFilePath(filePath, versionsMetadata)).toBe(
        version100,
      );
    });

    it('classifies files with ..-prefixed names inside docs as inside', () => {
      const filePath = path.join(siteDir, 'docs-selfhost', '..draft.mdx');
      expect(getVersionFromSourceFilePath(filePath, versionsMetadata)).toBe(
        currentVersion,
      );
    });
  });

  describe('error handling', () => {
    it('throws when file does not belong to any version', () => {
      const currentVersion = createVersionMetadataStub({
        versionName: 'current',
        contentPath: path.join(siteDir, 'docs'),
      });
      const filePath = path.join(siteDir, 'unrelated', 'file.mdx');
      expect(() =>
        getVersionFromSourceFilePath(filePath, [currentVersion]),
      ).toThrow(/does not belong to any docs version/);
    });
  });
});
