'use strict';

const process = require('node:process');
const { ClientApplicationAssetTypes, Endpoints } = require('../../util/Constants');
const Permissions = require('../../util/Permissions');
const SnowflakeUtil = require('../../util/SnowflakeUtil');
const Base = require('../Base');

const AssetTypes = Object.keys(ClientApplicationAssetTypes);

let deprecationEmittedForFetchAssets = false;

/**
 * Represents an OAuth2 Application.
 * @abstract
 */
class Application extends Base {
  constructor(client, data) {
    super(client);
    this._patch(data);
  }

  _patch(data) {
    /**
     * The application's id
     * @type {Snowflake}
     */
    this.id = data.id;

    if ('name' in data) {
      /**
       * The name of the application
       * @type {?string}
       */
      this.name = data.name;
    } else {
      this.name ??= null;
    }

    if ('description' in data) {
      /**
       * The application's description
       * @type {?string}
       */
      this.description = data.description;
    } else {
      this.description ??= null;
    }

    if ('icon' in data) {
      /**
       * The application's icon hash
       * @type {?string}
       */
      this.icon = data.icon;
    } else {
      this.icon ??= null;
    }
  }

  /**
   * The timestamp the application was created at
   * @type {number}
   * @readonly
   */
  get createdTimestamp() {
    return SnowflakeUtil.timestampFrom(this.id);
  }

  /**
   * The time the application was created at
   * @type {Date}
   * @readonly
   */
  get createdAt() {
    return new Date(this.createdTimestamp);
  }

  /**
   * Invites this application to a guild / server
   * @param {Snowflake} guild_id The id of the guild that you want to invite the bot to
   * @param {PermissionResolvable} [permissions] The permissions for the bot in number form (the default is 8 / Administrator)
   * @param {string} [captcha] The captcha key to add
   * @returns {Promise<void>} nothing :)
   */
  async invite(guild_id, permissions, captcha = null) {
    permissions = Permissions.resolve(permissions || 0n);
    const postData = {
      authorize: true,
      guild_id,
      permissions: '0',
    };
    if (permissions) {
      postData.permissions = permissions;
    }
    if (captcha && typeof captcha === 'string' && captcha.length > 0) {
      postData.captcha = captcha;
    }
    await this.client.api.oauth2.authorize.post({
      query: {
        client_id: this.id,
        scope: 'bot applications.commands',
      },
      data: postData,
      headers: {
        referer: `https://discord.com/oauth2/authorize?client_id=${this.id}&permissions=${permissions}&scope=bot`,
      },
    });
  }

  /**
   * A link to the application's icon.
   * @param {StaticImageURLOptions} [options={}] Options for the Image URL
   * @returns {?string}
   */
  iconURL({ format, size } = {}) {
    if (!this.icon) return null;
    return this.client.rest.cdn.AppIcon(this.id, this.icon, { format, size });
  }

  /**
   * A link to this application's cover image.
   * @param {StaticImageURLOptions} [options={}] Options for the Image URL
   * @returns {?string}
   */
  coverURL({ format, size } = {}) {
    if (!this.cover) return null;
    return Endpoints.CDN(this.client.options.http.cdn).AppIcon(this.id, this.cover, { format, size });
  }

  /**
   * Asset data.
   * @typedef {Object} ApplicationAsset
   * @property {Snowflake} id The asset's id
   * @property {string} name The asset's name
   * @property {string} type The asset's type
   */

  /**
   * Gets the application's rich presence assets.
   * @returns {Promise<Array<ApplicationAsset>>}
   * @deprecated This will be removed in the next major as it is unsupported functionality.
   */
  async fetchAssets() {
    if (!deprecationEmittedForFetchAssets) {
      process.emitWarning(
        'Application#fetchAssets is deprecated as it is unsupported and will be removed in the next major version.',
        'DeprecationWarning',
      );

      deprecationEmittedForFetchAssets = true;
    }

    const assets = await this.client.api.oauth2.applications(this.id).assets.get();
    return assets.map(a => ({
      id: a.id,
      name: a.name,
      type: AssetTypes[a.type - 1],
    }));
  }

  /**
   * When concatenated with a string, this automatically returns the application's name instead of the
   * Application object.
   * @returns {?string}
   * @example
   * // Logs: Application name: My App
   * console.log(`Application name: ${application}`);
   */
  toString() {
    return this.name;
  }

  toJSON() {
    return super.toJSON({ createdTimestamp: true });
  }
}

module.exports = Application;
