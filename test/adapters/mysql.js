/**
 * XadillaX created at 2016-08-08 17:46:49 With ♥
 *
 * Copyright (c) 2016 Souche.com, all rights
 * reserved.
 */
"use strict";

const path = require("path");

const decache = require("decache");
const moment = require("moment");
const otrans = require("otrans");
const runSync = require("sync-runner");
const should = require("should");

const Adapter = require("../../lib/adapters/base");
const common = require("../util/common");
const MySQLAdapter = require("../../lib/adapters/mysql");
const Toshihiko = require("../../lib/toshihiko");

describe("🐣 adapters/mysql", function() {
    describe("create", function() {
        it("should be instanceof Adapter", function(done) {
            const par = {};
            const options = {};
            const adapter = new MySQLAdapter(par, options);

            adapter.should.be.instanceof(Adapter);
            adapter.mysql.end(done);
        });

        it("should have correct position of username, database, password", function(done) {
            const par = {};
            const options = {
                username: "username",
                password: "pwd",
                database: "test",

                host: "127.0.0.1"
            };
            const adapter = new MySQLAdapter(par, options);

            adapter.username.should.equal(options.username);
            adapter.database.should.equal(options.database);
            adapter.options.host.should.equal(options.host);
            adapter.options.port.should.equal(3306);
            adapter.mysql.config.connectionConfig.password.should.equal(options.password);

            should.not.exists(adapter.options.username);
            should.not.exists(adapter.options.password);
            should.not.exists(adapter.options.database);

            adapter.mysql.end(done);
        });

        it("should hijack parent's pool to be compatible", function(done) {
            const par = {};
            const adapter = new MySQLAdapter(par);
            par.pool.should.equal(adapter.mysql);
            par.pool.end(done);
        });

        describe("should use mysql2", function() {
            it("when default", function(done) {
                const Pool = require("mysql2/lib/pool");
                const adapter = new MySQLAdapter({}, {});

                adapter.mysql.should.be.instanceof(Pool);
                adapter.mysql.end(done);
            });

            it("when use config", function(done) {
                const Pool = require("mysql2/lib/pool");
                const options = { package: "mysql2" };
                const adapter = new MySQLAdapter({}, options);

                adapter.mysql.should.be.instanceof(Pool);
                adapter.mysql.end(done);
            });
        });

        describe("should use mysql", function() {
            it("when default with no mysql2", function(done) {
                decache("mysql2");
                decache("../../lib/adapters/mysql");
                const MySQLAdapter_ = require("../../lib/adapters/mysql");
                runSync("mv node_modules/mysql2 node_modules/mysql2.bak", path.resolve(__dirname, "../../"));

                const adapter = new MySQLAdapter_({}, {});
                runSync("mv node_modules/mysql2.bak node_modules/mysql2", path.resolve(__dirname, "../../"));

                const Pool = require("mysql/lib/Pool");
                adapter.mysql.should.be.instanceof(Pool);
                adapter.mysql.end(done);
            });

            it("when use config", function(done) {
                const Pool = require("mysql/lib/Pool");
                const options = { package: "mysql" };
                const adapter = new MySQLAdapter({}, options);

                adapter.mysql.should.be.instanceof(Pool);
                adapter.mysql.end(done);
            });
        });
    });

    [ "mysql", "mysql2" ].forEach(name => {
        describe(`${name} execute`, function() {
            const adapter = new MySQLAdapter({}, {
                username: "root",
                password: "",
                database: "toshihiko",
                charset: "utf8mb4_general_ci"
            });

            after(function() {
                adapter.mysql.end();
            });

            it("should execute `create table`", function(done) {
                adapter.execute("create table ??(id int(?) not null)", [ "test", 11 ], function(err, rows) {
                    should.ifError(err);
                    rows.serverStatus.should.equal(2);
                    done();
                });
            });

            it("should execute `show tables`", function(done) {
                adapter.execute("show tables;", function(err, rows) {
                    should.ifError(err);
                    otrans.toCamel(rows).should.deepEqual([ { tablesInToshihiko: "test" } ]);
                    done();
                });
            });

            it("should execute `drop table`", function(done) {
                adapter.execute("drop table test", [], function(err, rows) {
                    should.ifError(err);
                    rows.serverStatus.should.equal(2);
                    done();
                });
            });
        });

        describe(`${name} makeSql`, function() {
            const toshihiko = new Toshihiko("mysql", {
                username: "root",
                password: "",
                database: "toshihiko",
                charset: "utf8mb4_general_ci"
            });
            const adapter = toshihiko.adapter;
            const model = toshihiko.define("test", common.COMMON_SCHEMA);

            after(function() {
                adapter.mysql.end();
            });

            describe("should generate find sql", function() {
                it("with fields", function() {
                    const sql = adapter.makeSql("find", model, {
                        fields: model.schema.map(field => field.name)
                    });

                    console.log(sql);
                });
            });
        });

        describe(`${name} makeFieldWhere`, function() {
            const toshihiko = new Toshihiko("mysql", {
                username: "root",
                password: "",
                database: "toshihiko",
                charset: "utf8mb4_general_ci"
            });
            const adapter = toshihiko.adapter;
            const model = toshihiko.define("test", common.COMMON_SCHEMA);

            after(function() {
                adapter.mysql.end();
            });

            it("should generate - 1", function() {
                let sql;

                sql = adapter.makeFieldWhere(model, "key1", {
                    $neq: 1
                }, "and");
                sql.should.equal("`id` != 1");

                sql = adapter.makeFieldWhere(model, "key2", {
                    $eq: 1.2
                }, "and");
                sql.should.equal("`key2` = 1.2");

                sql = adapter.makeFieldWhere(model, "key2", {
                    $in: [ 1.2, 1.3 ]
                }, "and");
                sql.should.equal("`key2` IN (1.2, 1.3)");

                sql = adapter.makeFieldWhere(model, "key2", {
                    $neq: [ 1.2, 1.3 ]
                }, "and");
                sql.should.equal("(`key2` != 1.2 AND `key2` != 1.3)");

                sql = adapter.makeFieldWhere(model, "key2", {
                    $or: { $gt: 10, $lt: 3, $in: [ 4, 5 ], $neq: [ 6, 8 ] }
                }, "and");
                sql.should.equal("(`key2` > 10 OR `key2` < 3 OR `key2` IN (4, 5) OR (`key2` != 6 AND `key2` != 8))");

                sql = adapter.makeFieldWhere(model, "key2", {
                    $or: { $gt: 10, $lt: 3 },
                    $neq: [ 1, 11, null ]
                }, "and");
                sql.should.equal("((`key2` > 10 OR `key2` < 3) AND (`key2` != 1 AND `key2` != 11 AND " +
                    "`key2` IS NOT NULL))");

                sql = adapter.makeFieldWhere(model, "key2", {
                    $or: { $gt: 10, $lt: 3, $eq: { $or: [ 4, 5, 6, null ], $and: [ 1, 2 ] } },
                    $neq: [ 1, 11 ]
                }, "and");
                sql.should.equal("((`key2` > 10 OR `key2` < 3 OR ((`key2` = 1 AND `key2` = 2) AND (`key2` = 4 " +
                    "OR `key2` = 5 OR `key2` = 6 OR `key2` IS NULL))) AND (`key2` != 1 AND `key2` != 11))");

                sql = adapter.makeFieldWhere(model, "key3", {
                    $neq: [ { foo: "bar" }, { foo: "baz" }, [ { foo: "bar" } ] ]
                }, "and");
                sql.should.equal("(`key3` != (\"{\\\"foo\\\":\\\"bar\\\"}\") AND `key3` != " +
                    "(\"{\\\"foo\\\":\\\"baz\\\"}\") AND `key3` != (\"[{\\\"foo\\\":\\\"bar\\\"}]\"))");

                sql = adapter.makeFieldWhere(model, "key3", {
                    foo: "bar"
                }, "and");
                sql.should.equal("`key3` = \"{\\\"foo\\\":\\\"bar\\\"}\"");

                const date = new Date(0);
                const dateStr = moment(0).format("YYYY-MM-DD HH:mm:ss");
                sql = adapter.makeFieldWhere(model, "key5", date, "and");
                sql.should.equal("`key5` = \"" + dateStr + "\"");
            });

            it("should generate - 2", function() {
                let sql;

                sql = adapter.makeFieldWhere(model, "key1", {
                    $gt: 1,
                    $lt: -5,
                    $eq: null
                }, "or");
                sql.should.equal("(`id` > 1 OR `id` < -5 OR `id` IS NULL)");

                sql = adapter.makeFieldWhere(model, "key1", 1, "and");
                sql.should.equal("`id` = 1");

                sql = adapter.makeFieldWhere(model, "key3", 1, "and");
                sql.should.equal("`key3` = \"1\"");

                sql = adapter.makeFieldWhere(model, "key3", null, "and");
                sql.should.equal("`key3` IS NULL");

                sql = adapter.makeFieldWhere(model, "key4", {
                    $in: [ 1, 2, "bar" ]
                }, "and");
                sql.should.equal("`key4` IN (\"1\", \"2\", \"bar\")");

                sql = adapter.makeFieldWhere(model, "key6", { dec: 100 }, "and");
                sql.should.equal("`key6` = BIN(100)");
            });

            it("should generate - 3", function() {
                try {
                    adapter.makeFieldWhere(model, "fsdaklj", 1, "or");
                } catch(e) {
                    e.should.be.instanceof(Error);
                    e.message.indexOf("no field named").should.above(-1);
                }
            });
        });

        describe(`${name} makeOrder`, function() {
            const toshihiko = new Toshihiko("mysql", {
                username: "root",
                password: "",
                database: "toshihiko",
                charset: "utf8mb4_general_ci"
            });
            const adapter = toshihiko.adapter;
            const model = toshihiko.define("test", common.COMMON_SCHEMA);

            after(function() {
                adapter.mysql.end();
            });


            it("should generate - 1", function() {
                let sql;

                sql = adapter.makeOrder(model, [ { key1: -1 } ]);
                sql.should.equal("`id` DESC");

                sql = adapter.makeOrder(model, []);
                sql.should.equal("");

                sql = adapter.makeOrder(model, [{
                    key1: -1
                }, {
                    key2: 1
                }, {
                    key3: 2
                }, {
                    key4: -1
                }, {
                    key5: "123"
                }]);
                sql.should.equal("`id` DESC, `key2` ASC, `key3` ASC, `key4` DESC, `key5` ASC");
            });

            it("should generate - 2", function() {
                let sql;

                sql = adapter.makeOrder(model, [ {} ]);
                sql.should.equal("");

                try {
                    sql = adapter.makeOrder(model, [ { id: -1 } ]);
                } catch(e) {
                    e.message.indexOf("no field").should.above(-1);
                }
            });
        });
    });
});
