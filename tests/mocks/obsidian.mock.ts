import sinon from 'sinon'

export class MockAdapter {
  exists: sinon.SinonStub

  constructor() {
    this.exists = sinon.stub()
  }
}

export class MockVault {
  adapter: MockAdapter
  create: sinon.SinonStub
  createFolder: sinon.SinonStub

  constructor() {
    this.adapter = new MockAdapter()
    this.create = sinon.stub()
    this.createFolder = sinon.stub()
  }
}

export class MockApp {
  vault: MockVault
  loadData: sinon.SinonStub
  saveData: sinon.SinonStub

  constructor() {
    this.vault = new MockVault()
    this.loadData = sinon.stub()
    this.saveData = sinon.stub()
  }
} 