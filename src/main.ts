import { BigInt, Bytes } from "@graphprotocol/graph-ts";

import {
	dydx,
	LogDeposit,
	LogWithdraw,
	LogTransfer,
	LogBuy,
	LogSell,
	LogTrade,
	LogLiquidate,
	dydx__getMarketWithInfoResult,
	dydx__getMarketWithInfoResultValue0Struct,
	dydx__getMarketWithInfoResultValue3Struct,
} from "../generated/Solo Margin/dydx";
import { erc20 as erc20Contract } from "../generated/Solo Margin/erc20";
import { Token, Market, Balance, User } from "../generated/schema";

let zero = BigInt.fromI32(0);
let secondsPerYear = BigInt.fromI32(31536000);
let halfBase = BigInt.fromI32(1000000000);
let base = halfBase * halfBase;

class Rate {
	supply: BigInt;
	borrow: BigInt;

	constructor(supply: BigInt, borrow: BigInt) {
		this.supply = supply;
		this.borrow = borrow;
	}
}

export function handleDeposit(event: LogDeposit): void {
	let address = event.address;
	let marketId = event.params.market;
	let userId = event.params.accountOwner;
	let numberId = event.params.accountNumber;
	let par = event.params.update.newPar;

	let dydxContract = dydx.bind(address);

	let market = Market.load(marketId.toHexString());
	if (!market) {
		market = new Market(marketId.toHexString());

		let tokenAddress = dydxContract.getMarketTokenAddress(marketId);
		let tokenContract = erc20Contract.bind(tokenAddress);
		let token = new Token(tokenAddress.toHexString());

		market.token = tokenAddress.toHexString();
		token.address = tokenAddress;
		token.save();
	}

	let marketInfo = dydxContract.getMarketWithInfo(marketId);
	let marketStorage = marketInfo.value0 as dydx__getMarketWithInfoResultValue0Struct;
	let earningsRate = dydxContract.getEarningsRate();
	let rate = getRate(earningsRate.value, marketInfo);
	market.supplyRate = rate.supply;
	market.borrowRate = rate.borrow;
	market.supplyIndex = marketStorage.index.supply;
	market.borrowIndex = marketStorage.index.borrow;
	market.save();

	let user = User.load(userId.toHexString());
	if (!user) {
		user = new User(userId.toHexString());
		user.save();
	}

	let balanceId = userId.toHexString() + '-' + numberId.toHexString() + '-' + marketId.toHexString();
	let balance = Balance.load(balanceId);
	if (!balance) {
		balance = new Balance(balanceId);

		balance.user = userId.toHexString();
		balance.number = numberId;
		balance.market = marketId.toHexString();
	}
	balance.balance = par.sign
		? par.value
		: zero.minus(par.value);
	balance.save();
}

export function handleWithdraw(event: LogWithdraw): void {
	let address = event.address;
	let marketId = event.params.market;
	let userId = event.params.accountOwner;
	let numberId = event.params.accountNumber;
	let par = event.params.update.newPar;

	let dydxContract = dydx.bind(address);

	let market = Market.load(marketId.toHexString());
	let marketInfo = dydxContract.getMarketWithInfo(marketId);
	let marketStorage = marketInfo.value0 as dydx__getMarketWithInfoResultValue0Struct;
	let earningsRate = dydxContract.getEarningsRate();
	let rate = getRate(earningsRate.value, marketInfo);
	market.supplyRate = rate.supply;
	market.borrowRate = rate.borrow;
	market.supplyIndex = marketStorage.index.supply;
	market.borrowIndex = marketStorage.index.borrow;
	market.save();

	let user = User.load(userId.toHexString());
	if (!user) {
		user = new User(userId.toHexString());
		user.save();
	}

	let balanceId = userId.toHexString() + '-' + numberId.toHexString() + '-' + marketId.toHexString();
	let balance = Balance.load(balanceId);
	if (!balance) {
		balance = new Balance(balanceId);

		balance.user = userId.toHexString();
		balance.number = numberId;
		balance.market = marketId.toHexString();
	}
	balance.balance = par.sign
		? par.value
		: zero.minus(par.value);
	balance.save();
}

export function handleTransfer(event: LogTransfer): void {
	let userOneId = event.params.accountOneOwner;
	let numberOneId = event.params.accountOneNumber;
	let userTwoId = event.params.accountTwoOwner;
	let numberTwoId = event.params.accountTwoNumber;
	let marketId = event.params.market;
	let onePar = event.params.updateOne.newPar;
	let twoPar = event.params.updateTwo.newPar;

	let userOne = User.load(userOneId.toHexString());
	if (!userOne) {
		userOne = new User(userOneId.toHexString());
		userOne.save();
	}
	let userTwo = User.load(userTwoId.toHexString());
	if (!userTwo) {
		userTwo = new User(userTwoId.toHexString());
		userTwo.save();
	}

	let balanceOneId = userOneId.toHexString() + '-' + numberOneId.toHexString() + '-' + marketId.toHexString();
	let balanceOne = Balance.load(balanceOneId);
	if (!balanceOne) {
		balanceOne = new Balance(balanceOneId);

		balanceOne.user = userOneId.toHexString();
		balanceOne.number = numberOneId;
		balanceOne.market = marketId.toHexString();
	}
	balanceOne.balance = onePar.sign
		? onePar.value
		: zero.minus(onePar.value);
	balanceOne.save();

	let balanceTwoId = userTwoId.toHexString() + '-' + numberTwoId.toHexString() + '-' + marketId.toHexString();
	let balanceTwo = Balance.load(balanceTwoId);
	if (!balanceTwo) {
		balanceTwo = new Balance(balanceTwoId);

		balanceTwo.user = userTwoId.toHexString();
		balanceTwo.number = numberTwoId;
		balanceTwo.market = marketId.toHexString();
	}
	balanceTwo.balance = twoPar.sign
		? twoPar.value
		: zero.minus(twoPar.value);
	balanceTwo.save();
}

export function handleBuy(event: LogBuy): void {
	let address = event.address;
	let takerMarketId = event.params.takerMarket;
	let makerMarketId = event.params.makerMarket;
	let userId = event.params.accountOwner;
	let numberId = event.params.accountNumber;
	let takerPar = event.params.takerUpdate.newPar;
	let makerPar = event.params.makerUpdate.newPar;

	let user = User.load(userId.toHexString());
	if (!user) {
		user = new User(userId.toHexString());
		user.save();
	}

	let takerBalanceId = userId.toHexString() + '-' + numberId.toHexString() + '-' + takerMarketId.toHexString();
	let takerBalance = Balance.load(takerBalanceId);
	if (!takerBalance) {
		takerBalance = new Balance(takerBalanceId);

		takerBalance.user = userId.toHexString();
		takerBalance.number = numberId;
		takerBalance.market = takerMarketId.toHexString();
	}
	takerBalance.balance = takerPar.sign
		? takerPar.value
		: zero.minus(takerPar.value);
	takerBalance.save();

	let makerBalanceId = userId.toHexString() + '-' + numberId.toHexString() + '-' + makerMarketId.toHexString();
	let makerBalance = Balance.load(makerBalanceId);
	if (!makerBalance) {
		makerBalance = new Balance(makerBalanceId);

		makerBalance.user = userId.toHexString();
		makerBalance.number = numberId;
		makerBalance.market = makerMarketId.toHexString();
	}
	makerBalance.balance = makerPar.sign
		? makerPar.value
		: zero.minus(makerPar.value);
	makerBalance.save();
}

export function handleSell(event: LogSell): void {
	let address = event.address;
	let takerMarketId = event.params.takerMarket;
	let makerMarketId = event.params.makerMarket;
	let userId = event.params.accountOwner;
	let numberId = event.params.accountNumber;
	let takerPar = event.params.takerUpdate.newPar;
	let makerPar = event.params.makerUpdate.newPar;

	let user = User.load(userId.toHexString());
	if (!user) {
		user = new User(userId.toHexString());
		user.save();
	}

	let takerBalanceId = userId.toHexString() + '-' + numberId.toHexString() + '-' + takerMarketId.toHexString();
	let takerBalance = Balance.load(takerBalanceId);
	if (!takerBalance) {
		takerBalance = new Balance(takerBalanceId);

		takerBalance.user = userId.toHexString();
		takerBalance.number = numberId;
		takerBalance.market = takerMarketId.toHexString();
	}
	takerBalance.balance = takerPar.sign
		? takerPar.value
		: zero.minus(takerPar.value);
	takerBalance.save();

	let makerBalanceId = userId.toHexString() + '-' + numberId.toHexString() + '-' + makerMarketId.toHexString();
	let makerBalance = Balance.load(makerBalanceId);
	if (!makerBalance) {
		makerBalance = new Balance(makerBalanceId);

		makerBalance.user = userId.toHexString();
		makerBalance.number = numberId;
		makerBalance.market = makerMarketId.toHexString();
	}
	makerBalance.balance = makerPar.sign
		? makerPar.value
		: zero.minus(makerPar.value);
	makerBalance.save();
}

export function handleTrade(event: LogTrade): void {
	let address = event.address;
	let takerId = event.params.takerAccountOwner;
	let takerNumberId = event.params.takerAccountNumber;
	let makerId = event.params.makerAccountOwner;
	let makerNumberId = event.params.makerAccountNumber;
	let inputMarketId = event.params.inputMarket;
	let outputMarketId = event.params.outputMarket;
	let takerInputPar = event.params.takerInputUpdate.newPar;
	let takerOutputPar = event.params.takerOutputUpdate.newPar;
	let makerInputPar = event.params.makerInputUpdate.newPar;
	let makerOutputPar = event.params.makerOutputUpdate.newPar;

	let taker = User.load(takerId.toHexString());
	if (!taker) {
		taker = new User(takerId.toHexString());
		taker.save();
	}

	let maker = User.load(makerId.toHexString());
	if (!maker) {
		maker = new User(makerId.toHexString());
		maker.save();
	}

	let takerInputBalanceId = takerId.toHexString() + '-' + takerNumberId.toHexString() + '-' + inputMarketId.toHexString();
	let takerInputBalance = Balance.load(takerInputBalanceId);
	if (!takerInputBalance) {
		takerInputBalance = new Balance(takerInputBalanceId);

		takerInputBalance.user = takerId.toHexString();
		takerInputBalance.number = takerNumberId;
		takerInputBalance.market = inputMarketId.toHexString();
	}
	takerInputBalance.balance = takerInputPar.sign
		? takerInputPar.value
		: zero.minus(takerInputPar.value);
	takerInputBalance.save();

	let takerOutputBalanceId = takerId.toHexString() + '-' + takerNumberId.toHexString() + '-' + outputMarketId.toHexString();
	let takerOutputBalance = Balance.load(takerOutputBalanceId);
	if (!takerOutputBalance) {
		takerOutputBalance = new Balance(takerOutputBalanceId);

		takerOutputBalance.user = takerId.toHexString();
		takerOutputBalance.number = takerNumberId;
		takerOutputBalance.market = outputMarketId.toHexString();
	}
	takerOutputBalance.balance = takerOutputPar.sign
		? takerOutputPar.value
		: zero.minus(takerOutputPar.value);
	takerOutputBalance.save();

	let makerInputBalanceId = makerId.toHexString() + '-' + makerNumberId.toHexString() + '-' + inputMarketId.toHexString();
	let makerInputBalance = Balance.load(makerInputBalanceId);
	if (!makerInputBalance) {
		makerInputBalance = new Balance(makerInputBalanceId);

		makerInputBalance.user = makerId.toHexString();
		makerInputBalance.number = makerNumberId;
		makerInputBalance.market = inputMarketId.toHexString();
	}
	makerInputBalance.balance = makerInputPar.sign
		? makerInputPar.value
		: zero.minus(makerInputPar.value);
	makerInputBalance.save();

	let makerOutputBalanceId = makerId.toHexString() + '-' + makerNumberId.toHexString() + '-' + outputMarketId.toHexString();
	let makerOutputBalance = Balance.load(makerOutputBalanceId);
	if (!makerOutputBalance) {
		makerOutputBalance = new Balance(makerOutputBalanceId);

		makerOutputBalance.user = makerId.toHexString();
		makerOutputBalance.number = makerNumberId;
		makerOutputBalance.market = outputMarketId.toHexString();
	}
	makerOutputBalance.balance = makerOutputPar.sign
		? makerOutputPar.value
		: zero.minus(makerOutputPar.value);
	makerOutputBalance.save();
}

export function handleLiquidate(event: LogLiquidate): void {
	let address = event.address;
	let solidId = event.params.solidAccountOwner;
	let solidNumberId = event.params.solidAccountNumber;
	let liquidId = event.params.liquidAccountOwner;
	let liquidNumberId = event.params.liquidAccountNumber;
	let heldMarketId = event.params.heldMarket;
	let owedMarketId = event.params.owedMarket;
	let solidHeldPar = event.params.solidHeldUpdate.newPar;
	let solidOwedPar = event.params.solidOwedUpdate.newPar;
	let liquidHeldPar = event.params.liquidHeldUpdate.newPar;
	let liquidOwedPar = event.params.liquidOwedUpdate.newPar;

	let solid = User.load(solidId.toHexString());
	if (!solid) {
		solid = new User(solidId.toHexString());
		solid.save();
	}

	let liquid = User.load(liquidId.toHexString());
	if (!liquid) {
		liquid = new User(liquidId.toHexString());
		liquid.save();
	}

	let solidHeldBalanceId = solidId.toHexString() + '-' + solidNumberId.toHexString() + '-' + heldMarketId.toHexString();
	let solidHeldBalance = Balance.load(solidHeldBalanceId);
	if (!solidHeldBalance) {
		solidHeldBalance = new Balance(solidHeldBalanceId);

		solidHeldBalance.user = solidId.toHexString();
		solidHeldBalance.number = solidNumberId;
		solidHeldBalance.market = heldMarketId.toHexString();
	}
	solidHeldBalance.balance = solidHeldPar.sign
		? solidHeldPar.value
		: zero.minus(solidHeldPar.value);
	solidHeldBalance.save();

	let solidOwedBalanceId = solidId.toHexString() + '-' + solidNumberId.toHexString() + '-' + owedMarketId.toHexString();
	let solidOwedBalance = Balance.load(solidOwedBalanceId);
	if (!solidOwedBalance) {
		solidOwedBalance = new Balance(solidOwedBalanceId);

		solidOwedBalance.user = solidId.toHexString();
		solidOwedBalance.number = solidNumberId;
		solidOwedBalance.market = owedMarketId.toHexString();
	}
	solidOwedBalance.balance = solidOwedPar.sign
		? solidOwedPar.value
		: zero.minus(solidOwedPar.value);
	solidOwedBalance.save();

	let liquidHeldBalanceId = liquidId.toHexString() + '-' + liquidNumberId.toHexString() + '-' + heldMarketId.toHexString();
	let liquidHeldBalance = Balance.load(liquidHeldBalanceId);
	if (!liquidHeldBalance) {
		liquidHeldBalance = new Balance(liquidHeldBalanceId);

		liquidHeldBalance.user = liquidId.toHexString();
		liquidHeldBalance.number = liquidNumberId;
		liquidHeldBalance.market = heldMarketId.toHexString();
	}
	liquidHeldBalance.balance = liquidHeldPar.sign
		? liquidHeldPar.value
		: zero.minus(liquidHeldPar.value);
	liquidHeldBalance.save();

	let liquidOwedBalanceId = liquidId.toHexString() + '-' + liquidNumberId.toHexString() + '-' + owedMarketId.toHexString();
	let liquidOwedBalance = Balance.load(liquidOwedBalanceId);
	if (!liquidOwedBalance) {
		liquidOwedBalance = new Balance(liquidOwedBalanceId);

		liquidOwedBalance.user = liquidId.toHexString();
		liquidOwedBalance.number = liquidNumberId;
		liquidOwedBalance.market = owedMarketId.toHexString();
	}
	liquidOwedBalance.balance = liquidOwedPar.sign
		? liquidOwedPar.value
		: zero.minus(liquidOwedPar.value);
	liquidOwedBalance.save();
}

function getRate(earningsRate: BigInt, marketInfo: dydx__getMarketWithInfoResult): Rate {
	let marketStorage = marketInfo.value0 as dydx__getMarketWithInfoResultValue0Struct;
	let marketRate = marketInfo.value3 as dydx__getMarketWithInfoResultValue3Struct;
	let supplyPar = marketStorage.totalPar.supply;
	let borrowPar = marketStorage.totalPar.borrow;
	let supplyIndex = marketStorage.index.supply;
	let borrowIndex = marketStorage.index.borrow;
	let supply = supplyPar * supplyIndex;
	let borrow = borrowPar * borrowIndex;
	let utilization = supply == zero
		? zero
		: base * borrow / supply;
	let perSecondRate = marketRate.value;
	let borrowRate = perSecondRate * secondsPerYear;
	let supplyRate = (borrowRate * utilization * earningsRate) / (base * base);
	let rate = new Rate(supplyRate, borrowRate);
	return rate;
}
